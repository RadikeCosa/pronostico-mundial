import type { MatchListItem } from "./read-models";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTERFINAL: "Cuartos",
  SEMIFINAL: "Semifinal",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
};

const resolutionMethodLabels: Record<
  "REGULAR" | "EXTRA_TIME" | "PENALTIES",
  string
> = {
  REGULAR: "En 90 minutos",
  EXTRA_TIME: "En alargue",
  PENALTIES: "Por penales",
};

export function formatStageLabel(stage: string): string {
  return stageLabels[stage] ?? stage.replaceAll("_", " ");
}

export function formatParticipantName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es")
    .replace(/(^|[\s-])(\p{L})/gu, (_match, prefix: string, letter: string) => {
      return `${prefix}${letter.toLocaleUpperCase("es")}`;
    });
}

export function formatPredictionSummary(prediction: {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
} | null, context?: {
  stage?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}): string {
  if (!prediction) {
    return "Sin pronóstico";
  }

  const normalizedStage = context?.stage?.trim().toUpperCase();
  const isKnockout = Boolean(normalizedStage && normalizedStage !== "GROUP");
  if (isKnockout && context?.homeTeamName && context?.awayTeamName) {
    const methodLabel = prediction.resolutionMethod
      ? resolutionMethodLabels[prediction.resolutionMethod]
      : "Método sin definir";

    return `90': ${context.homeTeamName} ${prediction.homeScore} - ${prediction.awayScore} ${context.awayTeamName} · Clasifica ${prediction.advancesTeamName ?? "Sin definir"} · ${methodLabel}`;
  }

  const score = `${prediction.homeScore} - ${prediction.awayScore}`;
  if (!prediction.advancesTeamName) {
    return score;
  }

  return `${score} · clasifica ${prediction.advancesTeamName}`;
}

export function formatResultSummary(result: {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
} | null, context?: {
  stage?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}): string {
  if (!result) {
    return "Sin resultado";
  }

  const normalizedStage = context?.stage?.trim().toUpperCase();
  const isKnockout = Boolean(normalizedStage && normalizedStage !== "GROUP");

  if (isKnockout && context?.homeTeamName && context?.awayTeamName) {
    const methodLabel = result.resolutionMethod
      ? resolutionMethodLabels[result.resolutionMethod]
      : "Método sin definir";

    return `90': ${context.homeTeamName} ${result.homeScore} - ${result.awayScore} ${context.awayTeamName} · Clasifica ${result.advancesTeamName ?? "Sin definir"} · ${methodLabel}`;
  }

  const score = `${result.homeScore} - ${result.awayScore}`;
  if (!result.advancesTeamName) {
    return score;
  }

  return `${score} · clasifica ${result.advancesTeamName}`;
}

export function formatResolutionMethodLabel(
  resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null | undefined,
): string | null {
  if (!resolutionMethod) {
    return null;
  }

  return resolutionMethodLabels[resolutionMethod];
}

export function formatResultTrace(result: {
  createdByParticipantName?: string | null;
  updatedByParticipantName?: string | null;
} | null): string | null {
  if (!result?.createdByParticipantName) {
    return null;
  }

  if (
    !result.updatedByParticipantName ||
    result.updatedByParticipantName === result.createdByParticipantName
  ) {
    return `Agregado por ${result.createdByParticipantName}`;
  }

  return `Agregado por ${result.createdByParticipantName} · editado por ${result.updatedByParticipantName}`;
}

export function getMatchStatusLabel(match: Pick<MatchListItem, "isLocked"> & { hasResult?: boolean }): string {
  if (match.hasResult) {
    return "Con resultado";
  }

  return match.isLocked ? "Bloqueado" : "Disponible";
}
