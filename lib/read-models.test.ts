import { describe, expect, it } from "vitest";
import {
  buildMatchReadModel,
  buildStandingsTable,
  buildTournamentGoalStats,
  buildWorstPredictions,
  getAdminResultsGroupedByDay,
  getMatchReadModelById,
  getMatchDay,
  getTournamentGoalStats,
  groupMatchesByDay,
  isMatchLocked,
  toMatchListItem,
} from "./read-models";

describe("read models", () => {
  it("locks a match at the exact kickoff time", () => {
    const kickoffAt = new Date("2026-06-12T03:00:00.000Z");

    expect(isMatchLocked(kickoffAt, new Date("2026-06-12T02:59:59.000Z"))).toBe(false);
    expect(isMatchLocked(kickoffAt, new Date("2026-06-12T03:00:00.000Z"))).toBe(true);
  });

  it("groups matches by kickoff day in ET", () => {
    const now = new Date("2026-06-12T00:00:00.000Z");
    const matches = [
      toMatchListItem(
        {
          id: "m1",
          matchNumber: 1,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Mexico",
          awayTeamName: "South Africa",
          kickoffAt: new Date("2026-06-12T03:00:00.000Z"),
          venue: null,
          city: null,
        },
        now,
      ),
      toMatchListItem(
        {
          id: "m2",
          matchNumber: 2,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Korea Republic",
          awayTeamName: "Czechia",
          kickoffAt: new Date("2026-06-12T06:00:00.000Z"),
          venue: null,
          city: null,
        },
        now,
      ),
    ];

    expect(getMatchDay(matches[0].kickoffAt)).toBe("2026-06-11");
    expect(getMatchDay(matches[1].kickoffAt)).toBe("2026-06-12");
    expect(groupMatchesByDay(matches)).toEqual([
      { day: "2026-06-11", matches: [matches[0]] },
      { day: "2026-06-12", matches: [matches[1]] },
    ]);
  });

  it("hides other predictions before kickoff", () => {
    const readModel = buildMatchReadModel({
      match: {
        id: "m1",
        matchNumber: 1,
        stage: "GROUP",
        groupName: "A",
        homeTeamName: "Mexico",
        awayTeamName: "South Africa",
        kickoffAt: new Date("2026-06-12T03:00:00.000Z"),
        venue: null,
        city: null,
        predictions: [
          {
            participantId: "ramiro",
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: null,
          },
          {
            participantId: "pedro",
            homeScore: 1,
            awayScore: 0,
            advancesTeamName: null,
          },
        ],
        result: null,
      },
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
      ],
      currentParticipantName: "Ramiro",
      now: new Date("2026-06-12T02:59:59.000Z"),
    });

    expect(readModel.isLocked).toBe(false);
    expect(readModel.canRevealPredictions).toBe(false);
    expect(readModel.currentPrediction).toEqual({
      homeScore: 1,
      awayScore: 1,
      advancesTeamName: null,
    });
    expect(readModel.visiblePredictions).toEqual([]);
  });

  it("reveals predictions and missing participants after kickoff", () => {
    const readModel = buildMatchReadModel({
      match: {
        id: "m1",
        matchNumber: 89,
        stage: "QUARTERFINAL",
        groupName: null,
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        kickoffAt: new Date("2026-07-09T20:00:00.000Z"),
        venue: null,
        city: null,
        predictions: [
          {
            participantId: "ramiro",
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Argentina",
          },
        ],
        result: {
          homeScore: 1,
          awayScore: 1,
          advancesTeamName: "Argentina",
        },
      },
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
      ],
      currentParticipantName: "Ramiro",
      now: new Date("2026-07-09T20:00:00.000Z"),
    });

    expect(readModel.isLocked).toBe(true);
    expect(readModel.canRevealPredictions).toBe(true);
    expect(readModel.visiblePredictions).toEqual([
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        status: "submitted",
        prediction: {
          homeScore: 1,
          awayScore: 1,
          advancesTeamName: "Argentina",
        },
        score: {
          exactScore: 3,
          outcome: 0,
          advances: 1,
          total: 4,
          reason: "Empate exacto y clasificado acertado en eliminación directa.",
        },
      },
      {
        participantId: "pedro",
        participantName: "Pedro",
        status: "missing",
        prediction: null,
        score: {
          exactScore: 0,
          outcome: 0,
          advances: 0,
          total: 0,
          reason: "No cargó pronóstico.",
        },
      },
    ]);
  });

  it("reveals predictions at the exact kickoff boundary", () => {
    const readModel = buildMatchReadModel({
      match: {
        id: "m1",
        matchNumber: 1,
        stage: "GROUP",
        groupName: "A",
        homeTeamName: "Mexico",
        awayTeamName: "South Africa",
        kickoffAt: new Date("2026-06-12T03:00:00.000Z"),
        venue: null,
        city: null,
        predictions: [
          {
            participantId: "ramiro",
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: null,
          },
        ],
        result: null,
      },
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
      ],
      currentParticipantName: "Ramiro",
      now: new Date("2026-06-12T03:00:00.000Z"),
    });

    expect(readModel.isLocked).toBe(true);
    expect(readModel.canRevealPredictions).toBe(true);
    expect(readModel.visiblePredictions).toEqual([
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        status: "submitted",
        prediction: {
          homeScore: 1,
          awayScore: 1,
          advancesTeamName: null,
        },
        score: null,
      },
      {
        participantId: "pedro",
        participantName: "Pedro",
        status: "missing",
        prediction: null,
        score: null,
      },
    ]);
  });

  it("finds every worst prediction tied by goal distance", () => {
    const worstPredictions = buildWorstPredictions({
      match: {
        predictions: [
          {
            participantId: "ramiro",
            homeScore: 2,
            awayScore: 1,
            advancesTeamName: null,
          },
          {
            participantId: "pedro",
            homeScore: 0,
            awayScore: 3,
            advancesTeamName: null,
          },
          {
            participantId: "ana",
            homeScore: 4,
            awayScore: 3,
            advancesTeamName: null,
          },
        ],
        result: {
          homeScore: 2,
          awayScore: 2,
          advancesTeamName: null,
        },
      },
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
        { id: "ana", name: "Ana" },
      ],
      canRevealPredictions: true,
    });

    expect(worstPredictions).toEqual([
      {
        participantId: "pedro",
        participantName: "Pedro",
        prediction: {
          homeScore: 0,
          awayScore: 3,
          advancesTeamName: null,
        },
        distance: 3,
      },
      {
        participantId: "ana",
        participantName: "Ana",
        prediction: {
          homeScore: 4,
          awayScore: 3,
          advancesTeamName: null,
        },
        distance: 3,
      },
    ]);
  });

  it("does not expose worst predictions before reveal or without a result", () => {
    const args = {
      match: {
        predictions: [
          {
            participantId: "ramiro",
            homeScore: 2,
            awayScore: 1,
            advancesTeamName: null,
          },
        ],
        result: {
          homeScore: 2,
          awayScore: 2,
          advancesTeamName: null,
        },
      },
      participants: [{ id: "ramiro", name: "Ramiro" }],
    };

    expect(buildWorstPredictions({ ...args, canRevealPredictions: false })).toEqual([]);
    expect(
      buildWorstPredictions({
        ...args,
        match: { ...args.match, result: null },
        canRevealPredictions: true,
      }),
    ).toEqual([]);
  });

  it("builds tournament goal stats from loaded results", () => {
    expect(
      buildTournamentGoalStats([
        { homeScore: 2, awayScore: 1 },
        { homeScore: 0, awayScore: 0 },
        { homeScore: 3, awayScore: 2 },
      ]),
    ).toEqual({
      totalGoals: 8,
      resultedMatches: 3,
      averageGoalsPerMatch: 8 / 3,
    });
  });

  it("loads tournament goal stats from persisted results", async () => {
    const stats = await getTournamentGoalStats({
      matchResult: {
        findMany: async () => [
          { homeScore: 2, awayScore: 1 },
          { homeScore: 1, awayScore: 1 },
        ],
      },
    } as never);

    expect(stats).toEqual({
      totalGoals: 5,
      resultedMatches: 2,
      averageGoalsPerMatch: 2.5,
    });
  });

  it("exposes tournament goal stats in the match read model", async () => {
    const readModel = await getMatchReadModelById(
      "m1",
      "ramiro",
      new Date("2026-06-14T12:00:00.000Z"),
      {
        participant: {
          findMany: async () => [{ id: "ramiro", name: "Ramiro" }],
        },
        match: {
          findUnique: async () => ({
            id: "m1",
            matchNumber: 1,
            stage: "GROUP",
            groupName: "A",
            homeTeamName: "Mexico",
            awayTeamName: "South Africa",
            kickoffAt: new Date("2026-06-14T11:00:00.000Z"),
            venue: null,
            city: null,
            predictions: [],
            result: {
              homeScore: 2,
              awayScore: 1,
              advancesTeamName: null,
            },
          }),
        },
        matchResult: {
          findMany: async () => [
            { homeScore: 2, awayScore: 1 },
            { homeScore: 3, awayScore: 2 },
          ],
        },
      } as never,
    );

    expect(readModel?.tournamentGoalStats).toEqual({
      totalGoals: 8,
      resultedMatches: 2,
      averageGoalsPerMatch: 4,
    });
  });

  it("builds standings with partial results and missed locked matches", () => {
    const standings = buildStandingsTable({
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
      ],
      matches: [
        {
          id: "m1",
          matchNumber: 1,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Mexico",
          awayTeamName: "South Africa",
          kickoffAt: new Date("2026-06-12T03:00:00.000Z"),
          venue: null,
          city: null,
          predictions: [
            { participantId: "ramiro", homeScore: 1, awayScore: 1, advancesTeamName: null },
            { participantId: "pedro", homeScore: 1, awayScore: 0, advancesTeamName: null },
          ],
          result: { homeScore: 2, awayScore: 1, advancesTeamName: null },
        },
        {
          id: "m2",
          matchNumber: 2,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Korea Republic",
          awayTeamName: "Czechia",
          kickoffAt: new Date("2026-06-13T03:00:00.000Z"),
          venue: null,
          city: null,
          predictions: [{ participantId: "ramiro", homeScore: 1, awayScore: 0, advancesTeamName: null }],
          result: null,
        },
      ],
      now: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(standings).toEqual([
      {
        participantId: "pedro",
        participantName: "Pedro",
        totalPoints: 1,
        averagePoints: 1,
        scoredPredictions: 1,
        exactCount: 0,
        outcomeCount: 1,
        predictedMatches: 1,
        missedLockedMatches: 1,
      },
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        totalPoints: 0,
        averagePoints: 0,
        scoredPredictions: 1,
        exactCount: 0,
        outcomeCount: 0,
        predictedMatches: 2,
        missedLockedMatches: 0,
      },
    ]);
  });

  it("returns only aggregate information in standings rows", () => {
    const standings = buildStandingsTable({
      participants: [{ id: "ramiro", name: "ramiro" }],
      matches: [],
      now: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(standings).toEqual([
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        totalPoints: 0,
        averagePoints: 0,
        scoredPredictions: 0,
        exactCount: 0,
        outcomeCount: 0,
        predictedMatches: 0,
        missedLockedMatches: 0,
      },
    ]);
    expect(Object.keys(standings[0]).sort()).toEqual([
      "averagePoints",
      "exactCount",
      "missedLockedMatches",
      "outcomeCount",
      "participantId",
      "participantName",
      "predictedMatches",
      "scoredPredictions",
      "totalPoints",
    ]);
  });

  it("sorts standings by average points before total points", () => {
    const standings = buildStandingsTable({
      participants: [
        { id: "ramiro", name: "Ramiro" },
        { id: "pedro", name: "Pedro" },
      ],
      matches: [
        {
          id: "m1",
          matchNumber: 1,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Mexico",
          awayTeamName: "South Africa",
          kickoffAt: new Date("2026-06-12T03:00:00.000Z"),
          venue: null,
          city: null,
          predictions: [
            { participantId: "ramiro", homeScore: 2, awayScore: 1, advancesTeamName: null },
            { participantId: "pedro", homeScore: 2, awayScore: 1, advancesTeamName: null },
          ],
          result: { homeScore: 2, awayScore: 1, advancesTeamName: null },
        },
        {
          id: "m2",
          matchNumber: 2,
          stage: "GROUP",
          groupName: "A",
          homeTeamName: "Korea Republic",
          awayTeamName: "Czechia",
          kickoffAt: new Date("2026-06-13T03:00:00.000Z"),
          venue: null,
          city: null,
          predictions: [
            { participantId: "ramiro", homeScore: 1, awayScore: 0, advancesTeamName: null },
          ],
          result: { homeScore: 2, awayScore: 0, advancesTeamName: null },
        },
      ],
      now: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(standings.map((row) => row.participantName)).toEqual(["Pedro", "Ramiro"]);
    expect(standings[0]).toMatchObject({
      participantName: "Pedro",
      totalPoints: 3,
      averagePoints: 3,
      scoredPredictions: 1,
    });
    expect(standings[1]).toMatchObject({
      participantName: "Ramiro",
      totalPoints: 4,
      averagePoints: 2,
      scoredPredictions: 2,
    });
  });

  it("exposes result traceability names in admin results read model", async () => {
    const groupedMatches = await getAdminResultsGroupedByDay(
      new Date("2026-06-14T12:00:00.000Z"),
      {
        match: {
          findMany: async () => [
            {
              id: "m1",
              matchNumber: 1,
              stage: "GROUP",
              groupName: "A",
              homeTeamName: "Mexico",
              awayTeamName: "South Africa",
              kickoffAt: new Date("2026-06-14T11:00:00.000Z"),
              venue: null,
              city: null,
              result: {
                homeScore: 2,
                awayScore: 1,
                advancesTeamName: null,
                createdByParticipant: { name: "ramiro" },
                updatedByParticipant: { name: "PEDRO" },
              },
            },
          ],
        },
      } as never,
    );

    expect(groupedMatches[0].matches[0].result).toMatchObject({
      homeScore: 2,
      awayScore: 1,
      createdByParticipantName: "Ramiro",
      updatedByParticipantName: "Pedro",
    });
  });
});
