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

export function getMatchStatusLabel(match: Pick<MatchListItem, "isLocked"> & { hasResult?: boolean }): string {
  if (match.hasResult) {
    return "Con resultado";
  }

  return match.isLocked ? "Bloqueado" : "Abierto";
}
