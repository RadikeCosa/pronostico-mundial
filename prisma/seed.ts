import { readFileSync } from "node:fs";
import { pbkdf2, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { MatchStage, Prisma, PrismaClient } from "@prisma/client";
import {
  HISTORICAL_MATCH_RESULTS,
  upsertHistoricalMatchResults,
} from "./seed-data/historical-results";
import { auditLegacyKnockoutPredictionResolutionMethods } from "./seed-data/prediction-resolution-backfill";

const pbkdf2Async = promisify(pbkdf2);

type FixtureTeam = {
  name: string;
  code: string;
  groupName?: string;
};

type FixtureMatch = {
  matchNumber: number;
  stage: string;
  groupName?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  venue?: string;
  city?: string;
};

type FixtureData = {
  teams: FixtureTeam[];
  matches: FixtureMatch[];
};

type HistoricalPrediction = {
  participantName: string;
  matchNumber: number;
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string;
};

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "A Postgres connection URL is required to run the Prisma seed.",
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PARTICIPANTS = [
  {
    name: "Ramiro",
    isAdmin: true,
    initialPassword: process.env.RAMIRO_INITIAL_PASSWORD,
  },
  {
    name: "Pedro",
    isAdmin: false,
    initialPassword: process.env.PEDRO_INITIAL_PASSWORD,
  },
] as const;

const HISTORICAL_PREDICTIONS: HistoricalPrediction[] = [
  { participantName: "Pedro", matchNumber: 1, homeScore: 1, awayScore: 0 },
  { participantName: "Ramiro", matchNumber: 1, homeScore: 1, awayScore: 1 },
  { participantName: "Pedro", matchNumber: 2, homeScore: 2, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 2, homeScore: 2, awayScore: 3 },
  { participantName: "Pedro", matchNumber: 3, homeScore: 1, awayScore: 2 },
  { participantName: "Ramiro", matchNumber: 3, homeScore: 2, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 4, homeScore: 2, awayScore: 0 },
  { participantName: "Pedro", matchNumber: 4, homeScore: 0, awayScore: 1 },
  { participantName: "Pedro", matchNumber: 5, homeScore: 1, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 5, homeScore: 3, awayScore: 2 },
  { participantName: "Pedro", matchNumber: 6, homeScore: 1, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 6, homeScore: 0, awayScore: 2 },
  { participantName: "Ramiro", matchNumber: 7, homeScore: 0, awayScore: 3 },
  { participantName: "Pedro", matchNumber: 7, homeScore: 0, awayScore: 2 },
  { participantName: "Pedro", matchNumber: 8, homeScore: 0, awayScore: 2 },
  { participantName: "Ramiro", matchNumber: 8, homeScore: 2, awayScore: 2 },
];

const STAGE_MAP: Record<string, MatchStage> = {
  Group: MatchStage.GROUP,
  "Round of 32": MatchStage.ROUND_OF_32,
  "Round of 16": MatchStage.ROUND_OF_16,
  Quarterfinal: MatchStage.QUARTERFINAL,
  Semifinal: MatchStage.SEMIFINAL,
  "Third Place": MatchStage.THIRD_PLACE,
  Final: MatchStage.FINAL,
};

function normalizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeNameForLogin(name: string): string {
  return normalizeParticipantName(name).toLocaleLowerCase("es");
}

function slugifyParticipantName(name: string): string {
  const normalized = normalizeNameForLogin(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "participante";
}

async function hashPassword(password: string): Promise<string> {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await pbkdf2Async(password, salt, iterations, 32, "sha256");

  return ["pbkdf2_sha256", iterations.toString(), salt, derivedKey.toString("base64url")].join("$");
}

function loadFixture(): FixtureData {
  const fixturePath = resolve(process.cwd(), "prisma/seed-data/fixture.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureData;
}

async function main() {
  const fixture = loadFixture();

  for (const participant of PARTICIPANTS) {
    const passwordHash = participant.initialPassword
      ? await hashPassword(participant.initialPassword)
      : undefined;
    const authData: Prisma.ParticipantUpdateInput = {
      active: true,
      slug: slugifyParticipantName(participant.name),
      normalizedName: normalizeNameForLogin(participant.name),
      isAdmin: participant.isAdmin,
    };

    if (passwordHash) {
      authData.passwordHash = passwordHash;
    }

    await prisma.participant.upsert({
      where: { name: participant.name },
      update: authData,
      create: {
        name: participant.name,
        slug: slugifyParticipantName(participant.name),
        normalizedName: normalizeNameForLogin(participant.name),
        passwordHash,
        isAdmin: participant.isAdmin,
        active: true,
      },
    });
  }

  for (const team of fixture.teams) {
    await prisma.team.upsert({
      where: { code: team.code },
      update: {
        name: team.name,
        groupName: team.groupName ?? null,
      },
      create: {
        name: team.name,
        code: team.code,
        groupName: team.groupName ?? null,
      },
    });
  }

  const teams = await prisma.team.findMany();
  const teamByName = new Map(teams.map((team) => [team.name, team]));

  for (const match of fixture.matches) {
    const homeTeam = teamByName.get(match.homeTeam);
    const awayTeam = teamByName.get(match.awayTeam);
    const stage = STAGE_MAP[match.stage];

    if (!stage) {
      throw new Error(`Unsupported match stage: ${match.stage}`);
    }

    await prisma.match.upsert({
      where: { matchNumber: match.matchNumber },
      update: {
        stage,
        groupName: match.groupName ?? null,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeTeamId: homeTeam?.id ?? null,
        awayTeamId: awayTeam?.id ?? null,
        kickoffAt: new Date(match.kickoffAt),
        venue: match.venue ?? null,
        city: match.city ?? null,
      },
      create: {
        matchNumber: match.matchNumber,
        stage,
        groupName: match.groupName ?? null,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeTeamId: homeTeam?.id ?? null,
        awayTeamId: awayTeam?.id ?? null,
        kickoffAt: new Date(match.kickoffAt),
        venue: match.venue ?? null,
        city: match.city ?? null,
      },
    });
  }

  const participants = await prisma.participant.findMany();
  const participantByName = new Map(
    participants.map((participant) => [participant.name, participant]),
  );
  const seedAdmin = participantByName.get("Ramiro") ?? null;

  const historicalMatchNumbers = new Set<number>([
    ...HISTORICAL_PREDICTIONS.map((prediction) => prediction.matchNumber),
    ...HISTORICAL_MATCH_RESULTS.map((result) => result.matchNumber),
  ]);
  const matches = await prisma.match.findMany({
    where: {
      matchNumber: {
        in: [...historicalMatchNumbers],
      },
    },
  });
  const matchByNumber = new Map(matches.map((match) => [match.matchNumber, match]));

  for (const prediction of HISTORICAL_PREDICTIONS) {
    const participant = participantByName.get(prediction.participantName);
    const match = matchByNumber.get(prediction.matchNumber);

    if (!participant || !match) {
      throw new Error(
        `Missing participant or match for seed prediction ${prediction.participantName} / ${prediction.matchNumber}`,
      );
    }

    await prisma.prediction.upsert({
      where: {
        participantId_matchId: {
          participantId: participant.id,
          matchId: match.id,
        },
      },
      update: {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancesTeamName: prediction.advancesTeamName ?? null,
      },
      create: {
        participantId: participant.id,
        matchId: match.id,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancesTeamName: prediction.advancesTeamName ?? null,
      },
    });
  }

  await upsertHistoricalMatchResults({
    prismaClient: prisma,
    matchByNumber,
    adminParticipantId: seedAdmin?.id ?? null,
  });

  const predictionResolutionAudit =
    await auditLegacyKnockoutPredictionResolutionMethods(prisma);
  const unresolvedLegacyPredictionMethods =
    predictionResolutionAudit.unresolvedNonDrawPredictions +
    predictionResolutionAudit.unresolvedDrawPredictions;

  if (unresolvedLegacyPredictionMethods > 0) {
    console.warn(
      "Seed warning: legacy knockout predictions without resolutionMethod were not modified because REGULAR and EXTRA_TIME cannot be inferred safely:",
      predictionResolutionAudit,
    );
  }

  console.log(
    `Seed complete: ${fixture.teams.length} teams, ${fixture.matches.length} matches, ${HISTORICAL_PREDICTIONS.length} predictions, ${HISTORICAL_MATCH_RESULTS.length} results, ${unresolvedLegacyPredictionMethods} legacy knockout prediction methods kept unresolved.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
