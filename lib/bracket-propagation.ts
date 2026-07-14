import {
  validateMatchOutcomeValues,
  type ResolutionMethod,
} from "./knockout-validation";

export type BracketSourceOutcome = "WINNER" | "LOSER";
export type BracketTargetSlot = "home" | "away";

export type BracketPropagationRule = {
  sourceMatchNumber: number;
  targetMatchNumber: number;
  targetSlot: BracketTargetSlot;
  sourceOutcome: BracketSourceOutcome;
};

export type BracketPropagationMatch = {
  matchNumber: number;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  result?: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod: ResolutionMethod | null;
  } | null;
};

export type ResolvedBracketSlot = {
  originalLabel: string;
  resolvedName: string | null;
  sourceMatchNumber: number | null;
  sourceOutcome: BracketSourceOutcome | null;
  isResolvedFromResult: boolean;
  effectiveName: string;
};

export type ResolvedBracketMatch = {
  matchNumber: number;
  homeSlot: ResolvedBracketSlot;
  awaySlot: ResolvedBracketSlot;
};

export type BracketTopologySource = {
  matchNumber: number;
  outcome: BracketSourceOutcome;
};

export type BracketTopologyMatch = {
  matchNumber: number;
  home: BracketTopologySource;
  away: BracketTopologySource;
};

// Official FIFA World Cup 2026 knockout topology. This is the only executable
// source of truth for every derived slot from the Round of 16 to the final.
export const KNOCKOUT_BRACKET_TOPOLOGY: readonly BracketTopologyMatch[] = [
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
] as const;

const BRACKET_PROPAGATION_RULES: readonly BracketPropagationRule[] =
  KNOCKOUT_BRACKET_TOPOLOGY.flatMap((match) => ([
    {
      sourceMatchNumber: match.home.matchNumber,
      targetMatchNumber: match.matchNumber,
      targetSlot: "home" as const,
      sourceOutcome: match.home.outcome,
    },
    {
      sourceMatchNumber: match.away.matchNumber,
      targetMatchNumber: match.matchNumber,
      targetSlot: "away" as const,
      sourceOutcome: match.away.outcome,
    },
  ]));

const propagationRuleByTarget = new Map<string, BracketPropagationRule>(
  BRACKET_PROPAGATION_RULES.map((rule) => [
    `${rule.targetMatchNumber}:${rule.targetSlot}`,
    rule,
  ]),
);

const dependentRulesBySource = new Map<number, BracketPropagationRule[]>();

for (const rule of BRACKET_PROPAGATION_RULES) {
  const existingRules = dependentRulesBySource.get(rule.sourceMatchNumber);

  if (existingRules) {
    existingRules.push(rule);
    continue;
  }

  dependentRulesBySource.set(rule.sourceMatchNumber, [rule]);
}

function isPlaceholderName(name: string): boolean {
  return /^(?:W|L)-\d+(?:-\d+)?$/i.test(name.trim()) || /^TBD$/i.test(name.trim());
}

function isConcreteTeamName(name: string | null): name is string {
  return typeof name === "string" && name.length > 0 && !isPlaceholderName(name);
}

function createBaseSlot(originalLabel: string): ResolvedBracketSlot {
  return {
    originalLabel,
    resolvedName: null,
    sourceMatchNumber: null,
    sourceOutcome: null,
    isResolvedFromResult: false,
    effectiveName: originalLabel,
  };
}

function createUnresolvedDerivedSlot(args: {
  originalLabel: string;
  sourceMatchNumber: number;
  sourceOutcome: BracketSourceOutcome;
}): ResolvedBracketSlot {
  return {
    originalLabel: args.originalLabel,
    resolvedName: null,
    sourceMatchNumber: args.sourceMatchNumber,
    sourceOutcome: args.sourceOutcome,
    isResolvedFromResult: false,
    effectiveName: "TBD",
  };
}

export function buildResolvedBracketIndex(
  matches: BracketPropagationMatch[],
): Map<number, ResolvedBracketMatch> {
  const matchByNumber = new Map(matches.map((match) => [match.matchNumber, match]));
  const resolvedByMatchNumber = new Map<number, ResolvedBracketMatch>();

  function resolveSlot(match: BracketPropagationMatch, slot: BracketTargetSlot): ResolvedBracketSlot {
    const originalLabel = slot === "home" ? match.homeTeamName : match.awayTeamName;
    const propagationRule = propagationRuleByTarget.get(`${match.matchNumber}:${slot}`);

    if (!propagationRule) {
      return createBaseSlot(originalLabel);
    }

    const sourceMatch = matchByNumber.get(propagationRule.sourceMatchNumber);

    if (!sourceMatch) {
      return createUnresolvedDerivedSlot({
        originalLabel,
        sourceMatchNumber: propagationRule.sourceMatchNumber,
        sourceOutcome: propagationRule.sourceOutcome,
      });
    }

    const resolvedSourceMatch = resolveMatch(sourceMatch);
    const sourceHomeName = resolvedSourceMatch.homeSlot.effectiveName;
    const sourceAwayName = resolvedSourceMatch.awaySlot.effectiveName;
    const sourceOutcomeValidation = validateMatchOutcomeValues({
      stage: sourceMatch.stage,
      homeTeamName: sourceHomeName,
      awayTeamName: sourceAwayName,
      homeScoreRaw: sourceMatch.result?.homeScore,
      awayScoreRaw: sourceMatch.result?.awayScore,
      advancesTeamNameRaw: sourceMatch.result?.advancesTeamName,
      resolutionMethodRaw: sourceMatch.result?.resolutionMethod,
    });

    if (
      sourceOutcomeValidation.status === "error" ||
      sourceOutcomeValidation.values.advancesTeamName === null
    ) {
      return createUnresolvedDerivedSlot({
        originalLabel,
        sourceMatchNumber: propagationRule.sourceMatchNumber,
        sourceOutcome: propagationRule.sourceOutcome,
      });
    }

    const normalizedAdvancesTeamName = sourceOutcomeValidation.values.advancesTeamName;

    if (propagationRule.sourceOutcome === "WINNER") {
      if (!isConcreteTeamName(normalizedAdvancesTeamName)) {
        return createUnresolvedDerivedSlot({
          originalLabel,
          sourceMatchNumber: propagationRule.sourceMatchNumber,
          sourceOutcome: propagationRule.sourceOutcome,
        });
      }

      return {
        originalLabel,
        resolvedName: normalizedAdvancesTeamName,
        sourceMatchNumber: propagationRule.sourceMatchNumber,
        sourceOutcome: propagationRule.sourceOutcome,
        isResolvedFromResult: true,
        effectiveName: normalizedAdvancesTeamName,
      };
    }

    const losingTeamName =
      normalizedAdvancesTeamName === sourceHomeName ? sourceAwayName : sourceHomeName;

    if (!isConcreteTeamName(losingTeamName)) {
      return createUnresolvedDerivedSlot({
        originalLabel,
        sourceMatchNumber: propagationRule.sourceMatchNumber,
        sourceOutcome: propagationRule.sourceOutcome,
      });
    }

    return {
      originalLabel,
      resolvedName: losingTeamName,
      sourceMatchNumber: propagationRule.sourceMatchNumber,
      sourceOutcome: propagationRule.sourceOutcome,
      isResolvedFromResult: true,
      effectiveName: losingTeamName,
    };
  }

  function resolveMatch(match: BracketPropagationMatch): ResolvedBracketMatch {
    const existingResolution = resolvedByMatchNumber.get(match.matchNumber);

    if (existingResolution) {
      return existingResolution;
    }

    const resolvedMatch: ResolvedBracketMatch = {
      matchNumber: match.matchNumber,
      homeSlot: resolveSlot(match, "home"),
      awaySlot: resolveSlot(match, "away"),
    };

    resolvedByMatchNumber.set(match.matchNumber, resolvedMatch);
    return resolvedMatch;
  }

  for (const match of matches) {
    resolveMatch(match);
  }

  return resolvedByMatchNumber;
}

export function getResolvedBracketMatch(args: {
  matchNumber: number;
  matches: BracketPropagationMatch[];
}): ResolvedBracketMatch | null {
  const resolvedByMatchNumber = buildResolvedBracketIndex(args.matches);
  return resolvedByMatchNumber.get(args.matchNumber) ?? null;
}

export function areResolvedMatchTeamsDefined(match: ResolvedBracketMatch): boolean {
  return (
    isConcreteTeamName(match.homeSlot.effectiveName) &&
    isConcreteTeamName(match.awaySlot.effectiveName)
  );
}

export function getDirectDependentMatchNumbers(matchNumber: number): number[] {
  const dependentRules = dependentRulesBySource.get(matchNumber) ?? [];

  return [...new Set(dependentRules.map((rule) => rule.targetMatchNumber))];
}

export function getDescendantMatchNumbers(matchNumber: number): number[] {
  const descendants = new Set<number>();
  const queue = [...getDirectDependentMatchNumbers(matchNumber)];

  while (queue.length > 0) {
    const nextMatchNumber = queue.shift();

    if (typeof nextMatchNumber !== "number" || descendants.has(nextMatchNumber)) {
      continue;
    }

    descendants.add(nextMatchNumber);
    queue.push(...getDirectDependentMatchNumbers(nextMatchNumber));
  }

  return [...descendants];
}

export { BRACKET_PROPAGATION_RULES };
