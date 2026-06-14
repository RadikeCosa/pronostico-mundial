import { describe, expect, it } from "vitest";
import {
  buildMatchReadModel,
  buildStandingsTable,
  getMatchDay,
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
          reason: "Exact draw and correct advancing team in knockout match.",
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
          reason: "No prediction submitted.",
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
        exactCount: 0,
        outcomeCount: 1,
        predictedMatches: 1,
        missedLockedMatches: 1,
      },
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        totalPoints: 0,
        exactCount: 0,
        outcomeCount: 0,
        predictedMatches: 2,
        missedLockedMatches: 0,
      },
    ]);
  });

  it("returns only aggregate information in standings rows", () => {
    const standings = buildStandingsTable({
      participants: [{ id: "ramiro", name: "Ramiro" }],
      matches: [],
      now: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(standings).toEqual([
      {
        participantId: "ramiro",
        participantName: "Ramiro",
        totalPoints: 0,
        exactCount: 0,
        outcomeCount: 0,
        predictedMatches: 0,
        missedLockedMatches: 0,
      },
    ]);
    expect(Object.keys(standings[0]).sort()).toEqual([
      "exactCount",
      "missedLockedMatches",
      "outcomeCount",
      "participantId",
      "participantName",
      "predictedMatches",
      "totalPoints",
    ]);
  });
});
