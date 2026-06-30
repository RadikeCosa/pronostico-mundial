import type { PrismaClient } from "@prisma/client";
import type { ResultFormState } from "@/components/result-form";
import { validateKnockoutWriteValues } from "./knockout-validation";
import { getPrismaClient } from "./prisma";
import { isMatchLocked } from "./read-models";
import {
  areResolvedMatchTeamsDefined,
  buildResolvedBracketIndex,
  getDescendantMatchNumbers,
  type BracketPropagationMatch,
} from "./bracket-propagation";

type AdminResultsPrismaClient = {
  match: {
    findUnique: PrismaClient["match"]["findUnique"];
    findMany: PrismaClient["match"]["findMany"];
  };
  matchResult: {
    findUnique: PrismaClient["matchResult"]["findUnique"];
    create: PrismaClient["matchResult"]["create"];
    update: PrismaClient["matchResult"]["update"];
  };
};

type AdminBracketMatchRecord = {
  id: string;
  matchNumber: number;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  result: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
  } | null;
  predictions: Array<{ id: string }>;
};

type UpsertAdminMatchResultArgs = {
  adminParticipantId: string;
  matchId: string;
  homeScoreRaw: FormDataEntryValue | null;
  awayScoreRaw: FormDataEntryValue | null;
  advancesTeamNameRaw: FormDataEntryValue | null;
  resolutionMethodRaw: FormDataEntryValue | null;
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

function toBracketPropagationMatch(
  match: Pick<
    AdminBracketMatchRecord,
    "matchNumber" | "stage" | "homeTeamName" | "awayTeamName" | "result"
  >,
): BracketPropagationMatch {
  return {
    matchNumber: match.matchNumber,
    stage: match.stage,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    result: match.result,
  };
}

export async function upsertAdminMatchResult({
  adminParticipantId,
  matchId,
  homeScoreRaw,
  awayScoreRaw,
  advancesTeamNameRaw,
  resolutionMethodRaw,
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

  if (!isMatchLocked(match.kickoffAt, now)) {
    return {
      status: "error",
      message: "Disponible desde el inicio del partido.",
    };
  }

  const bracketMatches = await prismaClient.match.findMany({
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      homeTeamName: true,
      awayTeamName: true,
      predictions: {
        select: {
          id: true,
        },
      },
      result: {
        select: {
          homeScore: true,
          awayScore: true,
          advancesTeamName: true,
        },
      },
    },
  }) as AdminBracketMatchRecord[];

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
        "Este cruce todavía depende de resultados anteriores. El resultado se habilitará cuando estén definidos ambos equipos.",
    };
  }

  const knockoutValidation = validateKnockoutWriteValues({
    stage: match.stage,
    homeTeamName: resolvedMatch.homeSlot.effectiveName,
    awayTeamName: resolvedMatch.awaySlot.effectiveName,
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

  const descendantMatchNumbers = getDescendantMatchNumbers(match.matchNumber);
  const proposedResult = {
    homeScore,
    awayScore,
    advancesTeamName: knockoutValidation.values.advancesTeamName,
  };

  if (descendantMatchNumbers.length > 0) {
    const nextBracketMatches = bracketMatches.map((bracketMatch) =>
      bracketMatch.matchNumber === match.matchNumber
        ? {
          ...bracketMatch,
          result: proposedResult,
        }
        : bracketMatch
    );
    const nextResolvedByMatchNumber = buildResolvedBracketIndex(
      nextBracketMatches.map((bracketMatch) => toBracketPropagationMatch(bracketMatch)),
    );
    const descendantActivityConflict = descendantMatchNumbers.some((descendantMatchNumber) => {
      const currentResolvedDescendant = resolvedByMatchNumber.get(descendantMatchNumber);
      const nextResolvedDescendant = nextResolvedByMatchNumber.get(descendantMatchNumber);
      const descendantMatch = bracketMatches.find(
        (bracketMatch) => bracketMatch.matchNumber === descendantMatchNumber,
      );

      if (!currentResolvedDescendant || !nextResolvedDescendant || !descendantMatch) {
        return false;
      }

      const teamsChanged =
        currentResolvedDescendant.homeSlot.effectiveName !==
          nextResolvedDescendant.homeSlot.effectiveName ||
        currentResolvedDescendant.awaySlot.effectiveName !==
          nextResolvedDescendant.awaySlot.effectiveName;

      if (!teamsChanged) {
        return false;
      }

      return descendantMatch.predictions.length > 0 || descendantMatch.result !== null;
    });

    if (descendantActivityConflict) {
      return {
        status: "error",
        message:
          "No se puede cambiar el clasificado porque ya existen pronósticos o resultados en partidos derivados. Corregí primero esos datos manualmente.",
      };
    }
  }

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
        advancesTeamName: knockoutValidation.values.advancesTeamName,
        resolutionMethod: knockoutValidation.values.resolutionMethod,
        updatedByParticipantId: adminParticipantId,
      },
    });
  } else {
    await prismaClient.matchResult.create({
      data: {
        matchId,
        homeScore,
        awayScore,
        advancesTeamName: knockoutValidation.values.advancesTeamName,
        resolutionMethod: knockoutValidation.values.resolutionMethod,
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
