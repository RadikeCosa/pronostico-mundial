import { describe, expect, it, vi } from "vitest";
import { OFFICIAL_MATCH_RESULTS } from "./seed-data/official-results";
import {
  renderOfficialResultsTable,
  syncOfficialResults,
  type SyncTransactionClient,
  validateOfficialResults,
} from "./sync-official-results";

function buildMatch(result: (typeof OFFICIAL_MATCH_RESULTS)[number]) {
  return {
    id: `match-${result.matchNumber}`,
    matchNumber: result.matchNumber,
    stage: result.matchNumber <= 72 ? "GROUP" : "ROUND_OF_32",
    homeTeamName: result.homeTeamName,
    awayTeamName: result.awayTeamName,
    kickoffAt: new Date("2026-07-12T00:00:00.000Z"),
  };
}

function buildClient(args?: {
  storedResults?: Array<{
    matchId: string;
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  }>;
}) {
  const create = vi.fn(async () => ({}));
  const update = vi.fn(async () => ({}));
  const transaction = {
    match: {
      findMany: vi.fn(async () => OFFICIAL_MATCH_RESULTS.map(buildMatch)),
    },
    matchResult: {
      findMany: vi.fn(async () => args?.storedResults ?? []),
      create,
      update,
    },
  };
  const client = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };

  return {
    client: client as unknown as Parameters<
      typeof syncOfficialResults
    >[0]["prismaClient"],
    create,
    update,
  };
}

describe("official result synchronization", () => {
  it("contains and validates the 100 finished matches", () => {
    expect(OFFICIAL_MATCH_RESULTS).toHaveLength(100);
    expect(OFFICIAL_MATCH_RESULTS.map((result) => result.matchNumber)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
    expect(() => validateOfficialResults()).not.toThrow();

    const table = renderOfficialResultsTable();
    expect(table).toContain("| 1 | Mexico vs South Africa | 2-0 |");
    expect(table).toContain(
      "| 100 | Argentina vs Switzerland | 3-1 | EXTRA_TIME | Argentina |",
    );
  });

  it("plans creates in dry-run without writing", async () => {
    const { client, create, update } = buildClient();

    const summary = await syncOfficialResults({
      prismaClient: client,
      dryRun: true,
      now: new Date("2026-07-14T12:00:00.000Z"),
    });

    expect(summary).toEqual({
      found: 100,
      written: 0,
      omitted: 0,
      pendingCreates: 100,
      pendingUpdates: 0,
      dryRun: true,
    });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("omits identical results and writes only missing results", async () => {
    const existing = OFFICIAL_MATCH_RESULTS.slice(0, 4).map((result) => ({
      matchId: `match-${result.matchNumber}`,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      advancesTeamName: result.advancesTeamName,
      resolutionMethod: result.resolutionMethod,
    }));
    const { client, create, update } = buildClient({ storedResults: existing });

    const summary = await syncOfficialResults({
      prismaClient: client,
      dryRun: false,
      now: new Date("2026-07-14T12:00:00.000Z"),
    });

    expect(summary).toEqual({
      found: 100,
      written: 96,
      omitted: 4,
      pendingCreates: 96,
      pendingUpdates: 0,
      dryRun: false,
    });
    expect(create).toHaveBeenCalledTimes(96);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a changed MatchResult without touching other models", async () => {
    const official = OFFICIAL_MATCH_RESULTS[0];
    const { client, create, update } = buildClient({
      storedResults: [
        {
          matchId: "match-1",
          homeScore: 0,
          awayScore: 0,
          advancesTeamName: null,
          resolutionMethod: null,
        },
        ...OFFICIAL_MATCH_RESULTS.slice(1).map((result) => ({
          matchId: `match-${result.matchNumber}`,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          advancesTeamName: result.advancesTeamName,
          resolutionMethod: result.resolutionMethod,
        })),
      ],
    });

    const summary = await syncOfficialResults({
      prismaClient: client,
      dryRun: false,
      now: new Date("2026-07-14T12:00:00.000Z"),
    });

    expect(summary.written).toBe(1);
    expect(summary.omitted).toBe(99);
    expect(summary.pendingUpdates).toBe(1);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { matchId: "match-1" },
      data: {
        homeScore: official.homeScore,
        awayScore: official.awayScore,
        advancesTeamName: null,
        resolutionMethod: null,
      },
    });
  });

  it("rejects a non-final match and rolls the transaction back", async () => {
    const { client, create, update } = buildClient();

    await expect(
      syncOfficialResults({
        prismaClient: client,
        dryRun: false,
        now: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("has not started yet");
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects concrete matchNumber identity mismatches", async () => {
    const { create, update } = buildClient();
    const mismatchedClient = {
      $transaction: async <T>(
        callback: (transaction: SyncTransactionClient) => Promise<T>,
      ): Promise<T> => {
        const transaction = {
          match: {
            findMany: async () => [
              {
                ...buildMatch(OFFICIAL_MATCH_RESULTS[0]),
                homeTeamName: "Wrong team",
              },
              ...OFFICIAL_MATCH_RESULTS.slice(1).map(buildMatch),
            ],
          },
          matchResult: {
            findMany: async () => [],
            create,
            update,
          },
        };

        return callback(transaction);
      },
    };

    await expect(
      syncOfficialResults({
        prismaClient: mismatchedClient,
        dryRun: true,
        now: new Date("2026-07-14T12:00:00.000Z"),
      }),
    ).rejects.toThrow(
      "Match 1: database has Wrong team vs South Africa; official result is Mexico vs South Africa.",
    );
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
