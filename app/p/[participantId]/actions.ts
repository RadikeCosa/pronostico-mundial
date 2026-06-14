"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/prisma";
import { isMatchLocked } from "@/lib/read-models";
import type { PredictionFormState } from "@/components/prediction-form";

function parseScore(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  if (!/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  return Number.parseInt(rawValue, 10);
}

export async function upsertPredictionAction(
  participantId: string,
  matchId: string,
  _previousState: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const prisma = getPrismaClient();
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { id: true, active: true },
  });

  if (!participant || !participant.active) {
    return {
      status: "error",
      message: "Participante no válido.",
    };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      stage: true,
      kickoffAt: true,
    },
  });

  if (!match) {
    return {
      status: "error",
      message: "Partido no encontrado.",
    };
  }

  if (isMatchLocked(match.kickoffAt, new Date())) {
    return {
      status: "error",
      message: "El partido ya empezó y el pronóstico está bloqueado.",
    };
  }

  const homeScore = parseScore(formData.get("homeScore"));
  const awayScore = parseScore(formData.get("awayScore"));

  if (homeScore === null || awayScore === null || homeScore < 0 || awayScore < 0) {
    return {
      status: "error",
      message: "Los goles deben ser enteros no negativos.",
    };
  }

  const advancesTeamNameRaw = formData.get("advancesTeamName");
  const advancesTeamName =
    typeof advancesTeamNameRaw === "string" && advancesTeamNameRaw.trim() !== ""
      ? advancesTeamNameRaw.trim()
      : null;

  const existingPrediction = await prisma.prediction.findUnique({
    where: {
      participantId_matchId: {
        participantId,
        matchId,
      },
    },
    select: { id: true },
  });

  if (existingPrediction) {
    await prisma.prediction.update({
      where: { id: existingPrediction.id },
      data: {
        homeScore,
        awayScore,
        advancesTeamName,
      },
    });
  } else {
    await prisma.prediction.create({
      data: {
        participantId,
        matchId,
        homeScore,
        awayScore,
        advancesTeamName,
      },
    });
  }

  revalidatePath(`/p/${participantId}`);
  revalidatePath(`/p/${participantId}/matches/${matchId}`);
  revalidatePath("/");

  return {
    status: "success",
    message: "Pronóstico guardado.",
  };
}
