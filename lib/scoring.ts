export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string | null;
} | null | undefined;

export type ResultInput = {
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string | null;
} | null | undefined;

export type MatchInput = {
  stage: string;
};

export type ScoreBreakdown = {
  exactScore: number;
  outcome: number;
  advances: number;
  total: number;
  reason: string;
};

function normalizeStage(stage: string): string {
  return stage.trim().toUpperCase();
}

function isGroupStage(stage: string): boolean {
  const normalizedStage = normalizeStage(stage);
  return normalizedStage === "GROUP";
}

function getOutcome(homeScore: number, awayScore: number): "home" | "away" | "draw" {
  if (homeScore === awayScore) {
    return "draw";
  }

  return homeScore > awayScore ? "home" : "away";
}

function hasExactScore(prediction: NonNullable<PredictionInput>, result: NonNullable<ResultInput>): boolean {
  return (
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
  );
}

function normalizeAdvancesTeamName(teamName?: string | null): string | null {
  const normalizedTeamName = teamName?.trim();
  return normalizedTeamName ? normalizedTeamName : null;
}

export function calculatePredictionScore(
  prediction: PredictionInput,
  result: ResultInput,
  match: MatchInput,
): ScoreBreakdown {
  if (!prediction) {
    return {
      exactScore: 0,
      outcome: 0,
      advances: 0,
      total: 0,
      reason: "No prediction submitted.",
    };
  }

  if (!result) {
    return {
      exactScore: 0,
      outcome: 0,
      advances: 0,
      total: 0,
      reason: "Match result is not available yet.",
    };
  }

  const exactScore = hasExactScore(prediction, result) ? 3 : 0;

  if (isGroupStage(match.stage)) {
    if (exactScore === 3) {
      return {
        exactScore,
        outcome: 0,
        advances: 0,
        total: 3,
        reason: "Exact score in group stage.",
      };
    }

    const predictedOutcome = getOutcome(prediction.homeScore, prediction.awayScore);
    const actualOutcome = getOutcome(result.homeScore, result.awayScore);
    const outcome = predictedOutcome === actualOutcome ? 1 : 0;

    return {
      exactScore: 0,
      outcome,
      advances: 0,
      total: outcome,
      reason:
        outcome === 1
          ? "Correct match outcome in group stage."
          : "Incorrect match outcome in group stage.",
    };
  }

  if (exactScore !== 3) {
    const predictedOutcome = getOutcome(prediction.homeScore, prediction.awayScore);
    const actualOutcome = getOutcome(result.homeScore, result.awayScore);
    const predictedAdvance = normalizeAdvancesTeamName(prediction.advancesTeamName);
    const actualAdvance = normalizeAdvancesTeamName(result.advancesTeamName);
    const advancesOnlyPoint =
      predictedOutcome === "draw" &&
      actualOutcome === "draw" &&
      predictedAdvance !== null &&
      predictedAdvance === actualAdvance
        ? 1
        : 0;

    return {
      exactScore: 0,
      outcome: 0,
      advances: advancesOnlyPoint,
      total: advancesOnlyPoint,
      reason:
        advancesOnlyPoint === 1
          ? "Knockout draw predicted without the exact score, but with the correct advancing team."
          : "Knockout match without an exact score or qualifying advancing-team bonus.",
    };
  }

  const actualOutcome = getOutcome(result.homeScore, result.awayScore);
  if (actualOutcome !== "draw") {
    return {
      exactScore,
      outcome: 0,
      advances: 0,
      total: 3,
      reason: "Exact score in knockout match.",
    };
  }

  const predictedAdvance = normalizeAdvancesTeamName(prediction.advancesTeamName);
  const actualAdvance = normalizeAdvancesTeamName(result.advancesTeamName);
  const advances = predictedAdvance !== null && predictedAdvance === actualAdvance ? 1 : 0;

  return {
    exactScore,
    outcome: 0,
    advances,
    total: exactScore + advances,
    reason:
      advances === 1
        ? "Exact draw and correct advancing team in knockout match."
        : "Exact draw in knockout match, but advancing team was not correct.",
  };
}
