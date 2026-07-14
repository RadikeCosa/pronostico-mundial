import { describe, expect, it } from "vitest";
import {
  KNOCKOUT_BRACKET_TOPOLOGY,
  areResolvedMatchTeamsDefined,
  buildResolvedBracketIndex,
  getDescendantMatchNumbers,
  type BracketPropagationMatch,
} from "./bracket-propagation";

const ROUND_OF_32_TEAMS = new Map<number, [string, string]>([
  [73, ["South Africa", "Canada"]],
  [74, ["Germany", "Paraguay"]],
  [75, ["Netherlands", "Morocco"]],
  [76, ["Brazil", "Japan"]],
  [77, ["France", "Sweden"]],
  [78, ["Ivory Coast", "Norway"]],
  [79, ["Mexico", "Ecuador"]],
  [80, ["England", "DR Congo"]],
  [81, ["United States", "Bosnia and Herzegovina"]],
  [82, ["Belgium", "Senegal"]],
  [83, ["Portugal", "Croatia"]],
  [84, ["Spain", "Austria"]],
  [85, ["Switzerland", "Algeria"]],
  [86, ["Argentina", "Cape Verde"]],
  [87, ["Colombia", "Ghana"]],
  [88, ["Australia", "Egypt"]],
]);

function createBracketMatches(resultMatchNumbers: number[] = []): BracketPropagationMatch[] {
  const resultMatchNumberSet = new Set(resultMatchNumbers);
  const matches: BracketPropagationMatch[] = [];

  for (let matchNumber = 73; matchNumber <= 88; matchNumber += 1) {
    const [homeTeamName, awayTeamName] = ROUND_OF_32_TEAMS.get(matchNumber)!;
    matches.push({
      matchNumber,
      stage: "ROUND_OF_32",
      homeTeamName,
      awayTeamName,
      result: resultMatchNumberSet.has(matchNumber)
        ? {
          homeScore: 1,
          awayScore: 0,
          advancesTeamName: homeTeamName,
          resolutionMethod: "REGULAR",
        }
        : null,
    });
  }

  for (const topologyMatch of KNOCKOUT_BRACKET_TOPOLOGY) {
    matches.push({
      matchNumber: topologyMatch.matchNumber,
      stage: topologyMatch.matchNumber <= 96
        ? "ROUND_OF_16"
        : topologyMatch.matchNumber <= 100
          ? "QUARTERFINAL"
          : topologyMatch.matchNumber <= 102
            ? "SEMIFINAL"
            : topologyMatch.matchNumber === 103
              ? "THIRD_PLACE"
              : "FINAL",
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      result: null,
    });
  }

  if (resultMatchNumbers.some((matchNumber) => matchNumber >= 89)) {
    for (const matchNumber of [...resultMatchNumbers].sort((a, b) => a - b)) {
      if (matchNumber < 89) {
        continue;
      }

      const match = matches.find((candidate) => candidate.matchNumber === matchNumber)!;
      const resolvedMatch = buildResolvedBracketIndex(matches).get(matchNumber)!;
      match.result = {
        homeScore: 1,
        awayScore: 0,
        advancesTeamName: resolvedMatch.homeSlot.effectiveName,
        resolutionMethod: "REGULAR",
      };
    }
  }

  return matches;
}

function expectResolvedSources(
  resultMatchNumbers: number[],
  targetMatchNumbers: number[],
): void {
  const resolvedIndex = buildResolvedBracketIndex(createBracketMatches(resultMatchNumbers));

  for (const targetMatchNumber of targetMatchNumbers) {
    const topologyMatch = KNOCKOUT_BRACKET_TOPOLOGY.find(
      (match) => match.matchNumber === targetMatchNumber,
    )!;
    const resolvedMatch = resolvedIndex.get(targetMatchNumber)!;
    const homeSource = resolvedIndex.get(topologyMatch.home.matchNumber)!;
    const awaySource = resolvedIndex.get(topologyMatch.away.matchNumber)!;

    expect(resolvedMatch.homeSlot).toMatchObject({
      effectiveName: homeSource.homeSlot.effectiveName,
      sourceMatchNumber: topologyMatch.home.matchNumber,
      sourceOutcome: topologyMatch.home.outcome,
      isResolvedFromResult: true,
    });
    expect(resolvedMatch.awaySlot).toMatchObject({
      effectiveName: awaySource.homeSlot.effectiveName,
      sourceMatchNumber: topologyMatch.away.matchNumber,
      sourceOutcome: topologyMatch.away.outcome,
      isResolvedFromResult: true,
    });
    expect(areResolvedMatchTeamsDefined(resolvedMatch)).toBe(true);
  }
}

describe("official 2026 knockout bracket topology", () => {
  it("defines every source from the Round of 16 through the final", () => {
    expect(KNOCKOUT_BRACKET_TOPOLOGY).toEqual([
      { matchNumber: 89, home: { matchNumber: 74, outcome: "WINNER" }, away: { matchNumber: 77, outcome: "WINNER" } },
      { matchNumber: 90, home: { matchNumber: 73, outcome: "WINNER" }, away: { matchNumber: 75, outcome: "WINNER" } },
      { matchNumber: 91, home: { matchNumber: 76, outcome: "WINNER" }, away: { matchNumber: 78, outcome: "WINNER" } },
      { matchNumber: 92, home: { matchNumber: 79, outcome: "WINNER" }, away: { matchNumber: 80, outcome: "WINNER" } },
      { matchNumber: 93, home: { matchNumber: 83, outcome: "WINNER" }, away: { matchNumber: 84, outcome: "WINNER" } },
      { matchNumber: 94, home: { matchNumber: 81, outcome: "WINNER" }, away: { matchNumber: 82, outcome: "WINNER" } },
      { matchNumber: 95, home: { matchNumber: 86, outcome: "WINNER" }, away: { matchNumber: 88, outcome: "WINNER" } },
      { matchNumber: 96, home: { matchNumber: 85, outcome: "WINNER" }, away: { matchNumber: 87, outcome: "WINNER" } },
      { matchNumber: 97, home: { matchNumber: 89, outcome: "WINNER" }, away: { matchNumber: 90, outcome: "WINNER" } },
      { matchNumber: 98, home: { matchNumber: 93, outcome: "WINNER" }, away: { matchNumber: 94, outcome: "WINNER" } },
      { matchNumber: 99, home: { matchNumber: 91, outcome: "WINNER" }, away: { matchNumber: 92, outcome: "WINNER" } },
      { matchNumber: 100, home: { matchNumber: 95, outcome: "WINNER" }, away: { matchNumber: 96, outcome: "WINNER" } },
      { matchNumber: 101, home: { matchNumber: 97, outcome: "WINNER" }, away: { matchNumber: 98, outcome: "WINNER" } },
      { matchNumber: 102, home: { matchNumber: 99, outcome: "WINNER" }, away: { matchNumber: 100, outcome: "WINNER" } },
      { matchNumber: 103, home: { matchNumber: 101, outcome: "LOSER" }, away: { matchNumber: 102, outcome: "LOSER" } },
      { matchNumber: 104, home: { matchNumber: 101, outcome: "WINNER" }, away: { matchNumber: 102, outcome: "WINNER" } },
    ]);
  });

  it("propagates all eight Round of 16 matches", () => {
    expectResolvedSources(
      Array.from({ length: 16 }, (_, index) => 73 + index),
      Array.from({ length: 8 }, (_, index) => 89 + index),
    );
  });

  it("propagates all four quarterfinals", () => {
    expectResolvedSources(
      Array.from({ length: 24 }, (_, index) => 73 + index),
      [97, 98, 99, 100],
    );
  });

  it("propagates both semifinals", () => {
    expectResolvedSources(
      Array.from({ length: 28 }, (_, index) => 73 + index),
      [101, 102],
    );
  });

  it("propagates semifinal losers to third place and winners to the final", () => {
    const resultMatchNumbers = Array.from({ length: 30 }, (_, index) => 73 + index);
    const matches = createBracketMatches(resultMatchNumbers);
    const semifinal101 = matches.find((match) => match.matchNumber === 101)!;
    const semifinal102 = matches.find((match) => match.matchNumber === 102)!;
    const beforeSemifinalResults = buildResolvedBracketIndex(
      matches.map((match) => match.matchNumber >= 101 ? { ...match, result: null } : match),
    );
    const resolved101 = beforeSemifinalResults.get(101)!;
    const resolved102 = beforeSemifinalResults.get(102)!;

    semifinal101.result = {
      homeScore: 1,
      awayScore: 0,
      advancesTeamName: resolved101.homeSlot.effectiveName,
      resolutionMethod: "REGULAR",
    };
    semifinal102.result = {
      homeScore: 0,
      awayScore: 1,
      advancesTeamName: resolved102.awaySlot.effectiveName,
      resolutionMethod: "REGULAR",
    };

    const resolvedIndex = buildResolvedBracketIndex(matches);
    expect(resolvedIndex.get(103)).toMatchObject({
      homeSlot: { effectiveName: resolved101.awaySlot.effectiveName, sourceOutcome: "LOSER" },
      awaySlot: { effectiveName: resolved102.homeSlot.effectiveName, sourceOutcome: "LOSER" },
    });
    expect(resolvedIndex.get(104)).toMatchObject({
      homeSlot: { effectiveName: resolved101.homeSlot.effectiveName, sourceOutcome: "WINNER" },
      awaySlot: { effectiveName: resolved102.awaySlot.effectiveName, sourceOutcome: "WINNER" },
    });
  });
});

describe("bracket propagation safeguards", () => {
  it("keeps TBD when a source result is still missing", () => {
    const resolvedIndex = buildResolvedBracketIndex(createBracketMatches([74]));

    expect(resolvedIndex.get(89)).toMatchObject({
      homeSlot: { effectiveName: "Germany", resolvedName: "Germany" },
      awaySlot: {
        effectiveName: "TBD",
        resolvedName: null,
        sourceMatchNumber: 77,
        isResolvedFromResult: false,
      },
    });
  });

  it("rejects advancesTeamName when the team did not play the source match", () => {
    const matches = createBracketMatches();
    matches.find((match) => match.matchNumber === 74)!.result = {
      homeScore: 1,
      awayScore: 0,
      advancesTeamName: "Egypt",
      resolutionMethod: "REGULAR",
    };

    expect(buildResolvedBracketIndex(matches).get(89)?.homeSlot).toMatchObject({
      effectiveName: "TBD",
      resolvedName: null,
      isResolvedFromResult: false,
    });
  });

  it("rejects advancesTeamName when it contradicts a non-draw score", () => {
    const matches = createBracketMatches();
    matches.find((match) => match.matchNumber === 74)!.result = {
      homeScore: 2,
      awayScore: 0,
      advancesTeamName: "Paraguay",
      resolutionMethod: "REGULAR",
    };

    expect(buildResolvedBracketIndex(matches).get(89)?.homeSlot.effectiveName).toBe("TBD");
  });

  it("does not read predictions when resolving teams", () => {
    const matches = createBracketMatches() as Array<BracketPropagationMatch & {
      predictions?: Array<{ advancesTeamName: string }>;
    }>;
    matches.find((match) => match.matchNumber === 74)!.predictions = [
      { advancesTeamName: "Germany" },
    ];

    expect(buildResolvedBracketIndex(matches).get(89)?.homeSlot.effectiveName).toBe("TBD");
  });

  it("returns the official descendant chain for a Round of 32 source", () => {
    expect(getDescendantMatchNumbers(73)).toEqual([90, 97, 101, 103, 104]);
    expect(getDescendantMatchNumbers(86)).toEqual([95, 100, 102, 103, 104]);
  });
});
