"use server";

import { revalidatePath } from "next/cache";
import { getCurrentParticipant } from "@/lib/auth/session";
import { getPrismaClient } from "@/lib/prisma";
import {
  areResolvedMatchTeamsDefined,
  buildResolvedBracketIndex,
  type BracketPropagationMatch,
} from "@/lib/bracket-propagation";
import { validateMatchOutcomeValues } from "@/lib/knockout-validation";
import { isMatchLocked } from "@/lib/read-models";
import type { PredictionFormState } from "@/components/prediction-form";

function toBracketPropagationMatch(match: {
  matchNumber: number;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  result: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  } | null;
}): BracketPropagationMatch {
  return {
    matchNumber: match.matchNumber,
    stage: match.stage,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    result: match.result,
  };
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
      matchNumber: true,
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

  const bracketMatches = await prisma.match.findMany({
    select: {
      matchNumber: true,
      stage: true,
      homeTeamName: true,
      awayTeamName: true,
      result: {
        select: {
          homeScore: true,
          awayScore: true,
          advancesTeamName: true,
          resolutionMethod: true,
        },
      },
    },
  });
  const resolvedByMatchNumber = buildResolvedBracketIndex(
    bracketMatches.map((bracketMatch) => toBracketPropagationMatch(bracketMatch)),
  );
  const resolvedMatch = resolvedByMatchNumber.get(match.matchNumber);

  if (!resolvedMatch) {
    return {
      status: "error",
      message: "Partido no encontrado.",
    };
  }

  if (match.stage !== "GROUP" && !areResolvedMatchTeamsDefined(resolvedMatch)) {
    return {
      status: "error",
      message:
        "Este cruce todavía depende de resultados anteriores. El pronóstico se habilitará cuando estén definidos ambos equipos.",
    };
  }

  const outcomeValidation = validateMatchOutcomeValues({
    stage: match.stage,
    homeTeamName: resolvedMatch.homeSlot.effectiveName,
    awayTeamName: resolvedMatch.awaySlot.effectiveName,
    homeScoreRaw: formData.get("homeScore"),
    awayScoreRaw: formData.get("awayScore"),
    advancesTeamNameRaw: formData.get("advancesTeamName"),
    resolutionMethodRaw: formData.get("resolutionMethod"),
  });

  if (outcomeValidation.status === "error") {
    return {
      status: "error",
      message: outcomeValidation.message,
    };
  }

  const {
    homeScore,
    awayScore,
    advancesTeamName,
    resolutionMethod,
  } = outcomeValidation.values;

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
        advancesTeamName,
        resolutionMethod,
      },
    });
  } else {
    await prisma.prediction.create({
      data: {
        participantId: currentParticipant.id,
        matchId,
        homeScore,
        awayScore,
        advancesTeamName,
        resolutionMethod,
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
