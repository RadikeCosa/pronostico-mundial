"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/prisma";
import type { ResultFormState } from "@/components/result-form";

function parseScore(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  if (!/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  return Number.parseInt(rawValue, 10);
}

export async function upsertMatchResultAction(
  matchId: string,
  _previousState: ResultFormState,
  formData: FormData,
): Promise<ResultFormState> {
  const homeScore = parseScore(formData.get("homeScore"));
  const awayScore = parseScore(formData.get("awayScore"));

  if (homeScore === null || awayScore === null || homeScore < 0 || awayScore < 0) {
    return {
      status: "error",
      message: "Los goles deben ser enteros no negativos.",
    };
  }

  const prisma = getPrismaClient();
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      stage: true,
    },
  });

  if (!match) {
    return {
      status: "error",
      message: "Partido no encontrado.",
    };
  }

  const advancesTeamNameRaw = formData.get("advancesTeamName");
  const advancesTeamName =
    match.stage !== "GROUP" &&
    typeof advancesTeamNameRaw === "string" &&
    advancesTeamNameRaw.trim() !== ""
      ? advancesTeamNameRaw.trim()
      : null;

  const existingResult = await prisma.matchResult.findUnique({
    where: { matchId },
    select: { id: true },
  });

  if (existingResult) {
    await prisma.matchResult.update({
      where: { id: existingResult.id },
      data: {
        homeScore,
        awayScore,
        advancesTeamName,
      },
    });
  } else {
    await prisma.matchResult.create({
      data: {
        matchId,
        homeScore,
        awayScore,
        advancesTeamName,
      },
    });
  }

  revalidatePath("/admin/results");
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Resultado guardado.",
  };
}
