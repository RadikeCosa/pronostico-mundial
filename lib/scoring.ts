import {
  normalizeResolutionMethod,
  type ResolutionMethod,
} from "./knockout-validation";

export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string | null;
  resolutionMethod?: ResolutionMethod | null;
} | null | undefined;

export type ResultInput = {
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string | null;
  resolutionMethod?: ResolutionMethod | null;
} | null | undefined;

export type MatchInput = {
  stage: string;
};

export type ScoreBreakdown = {
  exactScore: number;
  outcome: number;
  advances: number;
  method: number;
  bonus: number;
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
      method: 0,
      bonus: 0,
      total: 0,
      reason: "No cargó pronóstico.",
    };
  }

  if (!result) {
    return {
      exactScore: 0,
      outcome: 0,
      advances: 0,
      method: 0,
      bonus: 0,
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
        method: 0,
        bonus: 0,
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
      method: 0,
      bonus: 0,
      total: outcome,
      reason:
        outcome === 1
          ? "Ganador o empate acertado en fase de grupos."
          : "Ganador o empate no acertado en fase de grupos.",
    };
  }

  const predictedOutcome = getOutcome(prediction.homeScore, prediction.awayScore);
  const actualOutcome = getOutcome(result.homeScore, result.awayScore);
  const predictedAdvance = normalizeAdvancesTeamName(prediction.advancesTeamName);
  const actualAdvance = normalizeAdvancesTeamName(result.advancesTeamName);
  const predictedMethod = normalizeResolutionMethod(prediction.resolutionMethod);
  const actualMethod = normalizeResolutionMethod(result.resolutionMethod);

  const outcome = exactScore === 3 ? 0 : predictedOutcome === actualOutcome ? 1 : 0;
  const advances = predictedAdvance !== null && predictedAdvance === actualAdvance ? 1 : 0;
  const method =
    predictedMethod !== null &&
      actualMethod !== null &&
      predictedMethod === actualMethod
      ? 1
      : 0;
  const bonus = exactScore === 3 && advances === 1 ? 1 : 0;
  const total = exactScore + outcome + advances + method + bonus;

  const reasonParts: string[] = [];

  if (exactScore === 3) {
    reasonParts.push("Marcador exacto.");
  } else if (outcome === 1) {
    reasonParts.push("Signo acertado.");
  }

  if (advances === 1) {
    reasonParts.push("Clasificado acertado.");
  }

  if (method === 1) {
    reasonParts.push("Método de resolución acertado.");
  }

  if (bonus === 1) {
    reasonParts.push("Bonus por exacto + clasificado.");
  }

  return {
    exactScore,
    outcome,
    advances,
    method,
    bonus,
    total,
    reason: reasonParts.length > 0 ? reasonParts.join(" ") : "Sin aciertos en eliminación directa.",
  };
}
