"use server";

import { revalidatePath } from "next/cache";
import { getCurrentParticipant } from "@/lib/auth/session";
import { getPrismaClient } from "@/lib/prisma";
import { validateKnockoutWriteValues } from "@/lib/knockout-validation";
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
  const currentParticipant = await getCurrentParticipant();

  if (!currentParticipant) {
    return {
      status: "error",
      message: "Necesitás ingresar de nuevo para guardar tu pronóstico.",
    };
  }

  if (currentParticipant.id !== participantId) {
    return {
      status: "error",
      message: "No podés guardar pronósticos de otro participante.",
    };
  }

  const prisma = getPrismaClient();
  const participant = await prisma.participant.findUnique({
    where: { id: currentParticipant.id },
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
      homeTeamName: true,
      awayTeamName: true,
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
  const resolutionMethodRaw = formData.get("resolutionMethod");

  const knockoutValidation = validateKnockoutWriteValues({
    stage: match.stage,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    homeScore,
    awayScore,
    advancesTeamNameRaw,
    resolutionMethodRaw,
  });

  if (knockoutValidation.status === "error") {
    return {
      status: "error",
      message: knockoutValidation.message,
    };
  }

  const existingPrediction = await prisma.prediction.findUnique({
    where: {
      participantId_matchId: {
        participantId: currentParticipant.id,
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
        advancesTeamName: knockoutValidation.values.advancesTeamName,
        resolutionMethod: knockoutValidation.values.resolutionMethod,
      },
    });
  } else {
    await prisma.prediction.create({
      data: {
        participantId: currentParticipant.id,
        matchId,
        homeScore,
        awayScore,
        advancesTeamName: knockoutValidation.values.advancesTeamName,
        resolutionMethod: knockoutValidation.values.resolutionMethod,
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
