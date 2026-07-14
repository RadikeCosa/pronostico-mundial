import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { validateMatchOutcomeValues } from "../lib/knockout-validation.ts";
import {
  OFFICIAL_MATCH_RESULTS,
  OFFICIAL_RESULTS_SOURCES,
  type OfficialMatchResult,
} from "./seed-data/official-results.ts";

type StoredMatch = {
  id: string;
  matchNumber: number;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: Date;
};

type StoredMatchResult = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
};

type ResultValues = Omit<StoredMatchResult, "matchId">;

export type SyncTransactionClient = {
  match: {
    findMany: (args: unknown) => Promise<StoredMatch[]>;
  };
  matchResult: {
    findMany: (args: unknown) => Promise<StoredMatchResult[]>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
};

type SyncClient = {
  $transaction: <T>(
    callback: (transaction: SyncTransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ) => Promise<T>;
};

export type OfficialResultsSyncSummary = {
  found: number;
  written: number;
  omitted: number;
  pendingCreates: number;
  pendingUpdates: number;
  dryRun: boolean;
};

function areResultValuesIdentical(
  stored: StoredMatchResult,
  official: OfficialMatchResult,
): boolean {
  return (
    stored.homeScore === official.homeScore &&
    stored.awayScore === official.awayScore &&
    stored.advancesTeamName === official.advancesTeamName &&
    stored.resolutionMethod === official.resolutionMethod
  );
}

function getStoredMatchIdentityError(
  stored: StoredMatch,
  official: OfficialMatchResult,
): string | null {
  const storedUsesPlaceholders =
    stored.homeTeamName === "TBD" || stored.awayTeamName === "TBD";

  if (
    !storedUsesPlaceholders &&
    (stored.homeTeamName !== official.homeTeamName ||
      stored.awayTeamName !== official.awayTeamName)
  ) {
    return `Match ${official.matchNumber}: database has ${stored.homeTeamName} vs ${stored.awayTeamName}; official result is ${official.homeTeamName} vs ${official.awayTeamName}.`;
  }

  return null;
}

export function validateOfficialResults(
  results: OfficialMatchResult[] = OFFICIAL_MATCH_RESULTS,
): void {
  const seenMatchNumbers = new Set<number>();

  for (const result of results) {
    if (seenMatchNumbers.has(result.matchNumber)) {
      throw new Error(`Duplicate official result for match ${result.matchNumber}.`);
    }

    seenMatchNumbers.add(result.matchNumber);

    const validation = validateMatchOutcomeValues({
      stage: result.matchNumber <= 72 ? "GROUP" : "KNOCKOUT",
      homeTeamName: result.homeTeamName,
      awayTeamName: result.awayTeamName,
      homeScoreRaw: result.homeScore,
      awayScoreRaw: result.awayScore,
      advancesTeamNameRaw: result.advancesTeamName,
      resolutionMethodRaw: result.resolutionMethod,
    });

    if (validation.status === "error") {
      throw new Error(
        `Invalid official result for match ${result.matchNumber}: ${validation.message}`,
      );
    }
  }
}

export function renderOfficialResultsTable(
  results: OfficialMatchResult[] = OFFICIAL_MATCH_RESULTS,
): string {
  const rows = results.map((result) => {
    const method = result.resolutionMethod ?? "— (fase de grupos)";
    const advances = result.advancesTeamName ?? "—";

    return `| ${result.matchNumber} | ${result.homeTeamName} vs ${result.awayTeamName} | ${result.homeScore}-${result.awayScore} | ${method} | ${advances} | FIFA + FourFourTwo |`;
  });

  return [
    "| matchNumber | partido | resultado | método de resolución | clasificado | fuente |",
    "|---:|---|:---:|---|---|---|",
    ...rows,
    "",
    `[FIFA](${OFFICIAL_RESULTS_SOURCES.primary}) · [FourFourTwo](${OFFICIAL_RESULTS_SOURCES.secondary})`,
  ].join("\n");
}

export async function syncOfficialResults(args: {
  prismaClient: SyncClient;
  dryRun: boolean;
  now?: Date;
  results?: OfficialMatchResult[];
}): Promise<OfficialResultsSyncSummary> {
  const {
    prismaClient,
    dryRun,
    now = new Date(),
    results = OFFICIAL_MATCH_RESULTS,
  } = args;

  validateOfficialResults(results);

  return prismaClient.$transaction(async (transaction) => {
    const matchNumbers = results.map((result) => result.matchNumber);
    const matches = await transaction.match.findMany({
      where: { matchNumber: { in: matchNumbers } },
      select: {
        id: true,
        matchNumber: true,
        stage: true,
        homeTeamName: true,
        awayTeamName: true,
        kickoffAt: true,
      },
    });
    const matchByNumber = new Map(
      matches.map((match) => [match.matchNumber, match]),
    );
    const identityErrors: string[] = [];

    for (const result of results) {
      const match = matchByNumber.get(result.matchNumber);

      if (!match) {
        throw new Error(`Missing database match ${result.matchNumber}.`);
      }

      if (match.kickoffAt >= now) {
        throw new Error(
          `Match ${result.matchNumber} has not started yet; refusing to sync it as final.`,
        );
      }

      const identityError = getStoredMatchIdentityError(match, result);

      if (identityError) {
        identityErrors.push(identityError);
      }
    }

    const matchIds = matches.map((match) => match.id);
    const storedResults = await transaction.matchResult.findMany({
      where: { matchId: { in: matchIds } },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        advancesTeamName: true,
        resolutionMethod: true,
      },
    });
    const storedResultByMatchId = new Map(
      storedResults.map((result) => [result.matchId, result]),
    );

    if (identityErrors.length > 0) {
      let identical = 0;
      let missing = 0;
      let different = 0;

      for (const official of results) {
        const match = matchByNumber.get(official.matchNumber)!;
        const stored = storedResultByMatchId.get(match.id);

        if (!stored) {
          missing += 1;
        } else if (areResultValuesIdentical(stored, official)) {
          identical += 1;
        } else {
          different += 1;
        }
      }

      throw new Error(
        `Refusing to sync results because matchNumber identity validation failed (identical: ${identical}, missing: ${missing}, different: ${different}):\n${identityErrors.join("\n")}`,
      );
    }

    let omitted = 0;
    let pendingCreates = 0;
    let pendingUpdates = 0;
    let written = 0;

    for (const official of results) {
      const match = matchByNumber.get(official.matchNumber)!;
      const stored = storedResultByMatchId.get(match.id);
      const values: ResultValues = {
        homeScore: official.homeScore,
        awayScore: official.awayScore,
        advancesTeamName: official.advancesTeamName,
        resolutionMethod: official.resolutionMethod,
      };

      if (stored && areResultValuesIdentical(stored, official)) {
        omitted += 1;
        continue;
      }

      if (stored) {
        pendingUpdates += 1;

        if (!dryRun) {
          await transaction.matchResult.update({
            where: { matchId: match.id },
            data: values,
          });
          written += 1;
        }
      } else {
        pendingCreates += 1;

        if (!dryRun) {
          await transaction.matchResult.create({
            data: { matchId: match.id, ...values },
          });
          written += 1;
        }
      }
    }

    return {
      found: results.length,
      written,
      omitted,
      pendingCreates,
      pendingUpdates,
      dryRun,
    };
  }, { maxWait: 30_000, timeout: 120_000 });
}

async function runCli(): Promise<void> {
  loadEnv({ path: ".env.local", override: false });
  loadEnv({ path: ".env", override: false });

  const wantsApply = process.argv.includes("--apply");
  const wantsDryRun = process.argv.includes("--dry-run");

  if (wantsApply && wantsDryRun) {
    throw new Error("Use either --dry-run or --apply, not both.");
  }

  const dryRun = !wantsApply;
  const connectionString =
    process.env.DIRECT_DATABASE_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("A Postgres connection URL is required to sync results.");
  }

  validateOfficialResults();
  console.log(renderOfficialResultsTable());
  console.log("");
  console.log(dryRun ? "Mode: DRY RUN" : "Mode: APPLY");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const summary = await syncOfficialResults({
      prismaClient: prisma as unknown as SyncClient,
      dryRun,
    });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(pathToFileURL(resolve(process.argv[1])));

if (isMainModule) {
  runCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
