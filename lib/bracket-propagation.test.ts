import { describe, expect, it } from "vitest";
import {
  areResolvedMatchTeamsDefined,
  buildResolvedBracketIndex,
  getDescendantMatchNumbers,
  type BracketPropagationMatch,
} from "./bracket-propagation";

function createMatches(
  overrides: Array<Partial<BracketPropagationMatch> & { matchNumber: number }> = [],
): BracketPropagationMatch[] {
  const baseMatches: BracketPropagationMatch[] = [
    {
      matchNumber: 73,
      stage: "ROUND_OF_32",
      homeTeamName: "South Africa",
      awayTeamName: "Canada",
      result: null,
    },
    {
      matchNumber: 74,
      stage: "ROUND_OF_32",
      homeTeamName: "Brazil",
      awayTeamName: "Japan",
      result: null,
    },
    {
      matchNumber: 75,
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      result: null,
    },
    {
      matchNumber: 76,
      stage: "ROUND_OF_32",
      homeTeamName: "Netherlands",
      awayTeamName: "Morocco",
      result: null,
    },
    {
      matchNumber: 77,
      stage: "ROUND_OF_32",
      homeTeamName: "Ivory Coast",
      awayTeamName: "Norway",
      result: null,
    },
    {
      matchNumber: 78,
      stage: "ROUND_OF_32",
      homeTeamName: "France",
      awayTeamName: "Sweden",
      result: null,
    },
    {
      matchNumber: 89,
      stage: "ROUND_OF_16",
      homeTeamName: "Canada",
      awayTeamName: "Morocco",
      result: null,
    },
    {
      matchNumber: 90,
      stage: "ROUND_OF_16",
      homeTeamName: "Paraguay",
      awayTeamName: "W-32-5",
      result: null,
    },
    {
      matchNumber: 91,
      stage: "ROUND_OF_16",
      homeTeamName: "Brazil",
      awayTeamName: "W-32-6",
      result: null,
    },
    {
      matchNumber: 97,
      stage: "QUARTERFINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
    {
      matchNumber: 98,
      stage: "QUARTERFINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
    {
      matchNumber: 101,
      stage: "SEMIFINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
    {
      matchNumber: 102,
      stage: "SEMIFINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
    {
      matchNumber: 103,
      stage: "THIRD_PLACE",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
    {
      matchNumber: 104,
      stage: "FINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    },
  ];

  const overrideByMatchNumber = new Map(
    overrides.map((override) => [override.matchNumber, override]),
  );

  return baseMatches.map((match) => ({
    ...match,
    ...overrideByMatchNumber.get(match.matchNumber),
  }));
}

describe("bracket propagation", () => {
  it("resolves match 89 as Canada vs Morocco from results 73 and 76", () => {
    const resolvedByMatchNumber = buildResolvedBracketIndex(
      createMatches([
        {
          matchNumber: 73,
          result: {
            homeScore: 0,
            awayScore: 1,
            advancesTeamName: "Canada",
          },
        },
        {
          matchNumber: 76,
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Morocco",
          },
        },
      ]),
    );

    expect(resolvedByMatchNumber.get(89)).toMatchObject({
      homeSlot: {
        effectiveName: "Canada",
        resolvedName: "Canada",
        sourceMatchNumber: 73,
        sourceOutcome: "WINNER",
        isResolvedFromResult: true,
      },
      awaySlot: {
        effectiveName: "Morocco",
        resolvedName: "Morocco",
        sourceMatchNumber: 76,
        sourceOutcome: "WINNER",
        isResolvedFromResult: true,
      },
    });
  });

  it("keeps the unresolved placeholder when only one origin result exists", () => {
    const resolvedByMatchNumber = buildResolvedBracketIndex(
      createMatches([
        {
          matchNumber: 75,
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Paraguay",
          },
        },
      ]),
    );

    expect(resolvedByMatchNumber.get(90)).toMatchObject({
      homeSlot: {
        effectiveName: "Paraguay",
        resolvedName: "Paraguay",
      },
      awaySlot: {
        effectiveName: "W-32-5",
        resolvedName: null,
        sourceMatchNumber: 78,
        sourceOutcome: "WINNER",
        isResolvedFromResult: false,
      },
    });
  });

  it("resolves match 91 home as Brazil and keeps away as W-32-6 when 77 is pending", () => {
    const resolvedByMatchNumber = buildResolvedBracketIndex(
      createMatches([
        {
          matchNumber: 74,
          result: {
            homeScore: 2,
            awayScore: 1,
            advancesTeamName: "Brazil",
          },
        },
      ]),
    );

    expect(resolvedByMatchNumber.get(91)).toMatchObject({
      homeSlot: {
        effectiveName: "Brazil",
        resolvedName: "Brazil",
      },
      awaySlot: {
        effectiveName: "W-32-6",
      },
    });
  });

  it("ignores invalid advancesTeamName values and does not propagate them", () => {
    const resolvedByMatchNumber = buildResolvedBracketIndex(
      createMatches([
        {
          matchNumber: 73,
          result: {
            homeScore: 0,
            awayScore: 1,
            advancesTeamName: "Chile",
          },
        },
      ]),
    );

    expect(resolvedByMatchNumber.get(89)?.homeSlot).toMatchObject({
      effectiveName: "Canada",
      resolvedName: null,
      isResolvedFromResult: false,
    });
  });

  it("does not depend on predictions to resolve slots", () => {
    const matches = createMatches([
      {
        matchNumber: 73,
        result: null,
      },
      {
        matchNumber: 76,
        result: {
          homeScore: 1,
          awayScore: 1,
          advancesTeamName: "Morocco",
        },
      },
    ]);

    const resolvedByMatchNumber = buildResolvedBracketIndex(matches);

    expect(resolvedByMatchNumber.get(89)).toMatchObject({
      homeSlot: {
        effectiveName: "Canada",
        resolvedName: null,
        isResolvedFromResult: false,
      },
      awaySlot: {
        effectiveName: "Morocco",
        resolvedName: "Morocco",
        isResolvedFromResult: true,
      },
    });
  });

  it("routes semifinal winners and losers to final and third place", () => {
    const resolvedByMatchNumber = buildResolvedBracketIndex(
      createMatches([
        {
          matchNumber: 97,
          result: {
            homeScore: 2,
            awayScore: 1,
            advancesTeamName: "Canada",
          },
        },
        {
          matchNumber: 98,
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Brazil",
          },
        },
        {
          matchNumber: 101,
          homeTeamName: "Canada",
          awayTeamName: "Morocco",
          result: {
            homeScore: 2,
            awayScore: 1,
            advancesTeamName: "Canada",
          },
        },
        {
          matchNumber: 102,
          homeTeamName: "Brazil",
          awayTeamName: "Paraguay",
          result: {
            homeScore: 0,
            awayScore: 1,
            advancesTeamName: "Paraguay",
          },
        },
      ]),
    );

    expect(resolvedByMatchNumber.get(104)).toMatchObject({
      homeSlot: {
        effectiveName: "Canada",
        sourceMatchNumber: 101,
        sourceOutcome: "WINNER",
      },
      awaySlot: {
        effectiveName: "Paraguay",
        sourceMatchNumber: 102,
        sourceOutcome: "WINNER",
      },
    });
    expect(resolvedByMatchNumber.get(103)).toMatchObject({
      homeSlot: {
        effectiveName: "Morocco",
        sourceMatchNumber: 101,
        sourceOutcome: "LOSER",
      },
      awaySlot: {
        effectiveName: "Brazil",
        sourceMatchNumber: 102,
        sourceOutcome: "LOSER",
      },
    });
    expect(areResolvedMatchTeamsDefined(resolvedByMatchNumber.get(103)!)).toBe(true);
    expect(areResolvedMatchTeamsDefined(resolvedByMatchNumber.get(104)!)).toBe(true);
  });

  it("returns the full descendant chain for a source match", () => {
    expect(getDescendantMatchNumbers(73)).toEqual([89, 97, 101, 104, 103]);
  });
});
