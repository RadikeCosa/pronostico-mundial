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
      reason: "No cargó pronóstico.",
    };
  }

  if (!result) {
    return {
      exactScore: 0,
      outcome: 0,
      advances: 0,
      total: 0,
      reason: "Todavía no hay resultado cargado.",
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
        reason: "Resultado exacto en fase de grupos.",
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
          ? "Ganador o empate acertado en fase de grupos."
          : "Ganador o empate no acertado en fase de grupos.",
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
          ? "Empate pronosticado sin resultado exacto, pero con clasificado acertado."
          : "Sin resultado exacto ni bonus de clasificado.",
    };
  }

  const actualOutcome = getOutcome(result.homeScore, result.awayScore);
  if (actualOutcome !== "draw") {
    return {
      exactScore,
      outcome: 0,
      advances: 0,
      total: 3,
      reason: "Resultado exacto en eliminación directa.",
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
        ? "Empate exacto y clasificado acertado en eliminación directa."
        : "Empate exacto, pero el clasificado no fue acertado.",
  };
}
