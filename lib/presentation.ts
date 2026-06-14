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
} | null): string {
  if (!prediction) {
    return "Sin pronóstico";
  }

  const score = `${prediction.homeScore} - ${prediction.awayScore}`;
  if (!prediction.advancesTeamName) {
    return score;
  }

  return `${score} · clasifica ${prediction.advancesTeamName}`;
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

  return match.isLocked ? "Bloqueado" : "Abierto";
}
