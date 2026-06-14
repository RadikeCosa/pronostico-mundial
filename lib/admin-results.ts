import type { PrismaClient } from "@prisma/client";
import type { ResultFormState } from "@/components/result-form";
import { getPrismaClient } from "./prisma";
import { isMatchLocked } from "./read-models";

type AdminResultsPrismaClient = {
  match: {
    findUnique: PrismaClient["match"]["findUnique"];
  };
  matchResult: {
    findUnique: PrismaClient["matchResult"]["findUnique"];
    create: PrismaClient["matchResult"]["create"];
    update: PrismaClient["matchResult"]["update"];
  };
};

type UpsertAdminMatchResultArgs = {
  adminParticipantId: string;
  matchId: string;
  homeScoreRaw: FormDataEntryValue | null;
  awayScoreRaw: FormDataEntryValue | null;
  advancesTeamNameRaw: FormDataEntryValue | null;
  now?: Date;
  prismaClient?: AdminResultsPrismaClient;
};

function parseScore(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  if (!/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  return Number.parseInt(rawValue, 10);
}

export async function upsertAdminMatchResult({
  adminParticipantId,
  matchId,
  homeScoreRaw,
  awayScoreRaw,
  advancesTeamNameRaw,
  now = new Date(),
  prismaClient = getPrismaClient(),
}: UpsertAdminMatchResultArgs): Promise<ResultFormState> {
  const homeScore = parseScore(homeScoreRaw);
  const awayScore = parseScore(awayScoreRaw);

  if (homeScore === null || awayScore === null || homeScore < 0 || awayScore < 0) {
    return {
      status: "error",
      message: "Los goles deben ser enteros no negativos.",
    };
  }

  const match = await prismaClient.match.findUnique({
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

  if (!isMatchLocked(match.kickoffAt, now)) {
    return {
      status: "error",
      message: "Disponible desde el inicio del partido.",
    };
  }

  const advancesTeamName =
    match.stage !== "GROUP" &&
    typeof advancesTeamNameRaw === "string" &&
    advancesTeamNameRaw.trim() !== ""
      ? advancesTeamNameRaw.trim()
      : null;

  const existingResult = await prismaClient.matchResult.findUnique({
    where: { matchId },
    select: { id: true },
  });

  if (existingResult) {
    await prismaClient.matchResult.update({
      where: { id: existingResult.id },
      data: {
        homeScore,
        awayScore,
        advancesTeamName,
        updatedByParticipantId: adminParticipantId,
      },
    });
  } else {
    await prismaClient.matchResult.create({
      data: {
        matchId,
        homeScore,
        awayScore,
        advancesTeamName,
        createdByParticipantId: adminParticipantId,
        updatedByParticipantId: adminParticipantId,
      },
    });
  }

  return {
    status: "success",
    message: "Resultado guardado.",
  };
}
