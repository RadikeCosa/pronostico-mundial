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

const BRACKET_PROPAGATION_RULES: readonly BracketPropagationRule[] = [
  { sourceMatchNumber: 73, targetMatchNumber: 89, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 76, targetMatchNumber: 89, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 75, targetMatchNumber: 90, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 78, targetMatchNumber: 90, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 74, targetMatchNumber: 91, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 77, targetMatchNumber: 91, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 79, targetMatchNumber: 92, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 80, targetMatchNumber: 92, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 83, targetMatchNumber: 93, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 84, targetMatchNumber: 93, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 81, targetMatchNumber: 94, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 82, targetMatchNumber: 94, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 86, targetMatchNumber: 95, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 88, targetMatchNumber: 95, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 85, targetMatchNumber: 96, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 87, targetMatchNumber: 96, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 89, targetMatchNumber: 97, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 90, targetMatchNumber: 97, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 91, targetMatchNumber: 98, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 92, targetMatchNumber: 98, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 93, targetMatchNumber: 99, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 94, targetMatchNumber: 99, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 95, targetMatchNumber: 100, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 96, targetMatchNumber: 100, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 97, targetMatchNumber: 101, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 98, targetMatchNumber: 101, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 99, targetMatchNumber: 102, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 100, targetMatchNumber: 102, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 101, targetMatchNumber: 104, targetSlot: "home", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 102, targetMatchNumber: 104, targetSlot: "away", sourceOutcome: "WINNER" },
  { sourceMatchNumber: 101, targetMatchNumber: 103, targetSlot: "home", sourceOutcome: "LOSER" },
  { sourceMatchNumber: 102, targetMatchNumber: 103, targetSlot: "away", sourceOutcome: "LOSER" },
] as const;

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

function normalizeTeamName(name: string | null | undefined): string | null {
  if (typeof name !== "string") {
    return null;
  }

  const normalizedName = name.trim();
  return normalizedName.length > 0 ? normalizedName : null;
}

function isPlaceholderName(name: string): boolean {
  return /^W-\d+-\d+$/i.test(name) || /^TBD$/i.test(name.trim());
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
    effectiveName: args.originalLabel,
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
    const normalizedAdvancesTeamName = normalizeTeamName(
      sourceMatch.result?.advancesTeamName,
    );
    const sourceHomeName = resolvedSourceMatch.homeSlot.effectiveName;
    const sourceAwayName = resolvedSourceMatch.awaySlot.effectiveName;

    if (
      normalizedAdvancesTeamName === null ||
      (normalizedAdvancesTeamName !== sourceHomeName &&
        normalizedAdvancesTeamName !== sourceAwayName)
    ) {
      return createUnresolvedDerivedSlot({
        originalLabel,
        sourceMatchNumber: propagationRule.sourceMatchNumber,
        sourceOutcome: propagationRule.sourceOutcome,
      });
    }

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
