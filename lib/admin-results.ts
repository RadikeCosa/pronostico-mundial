import type { PrismaClient } from "@prisma/client";
import type { ResultFormState } from "@/components/result-form";
import { validateMatchOutcomeValues } from "./knockout-validation";
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
    resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
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
          resolutionMethod: true,
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

  const outcomeValidation = validateMatchOutcomeValues({
    stage: match.stage,
    homeTeamName: resolvedMatch.homeSlot.effectiveName,
    awayTeamName: resolvedMatch.awaySlot.effectiveName,
    homeScoreRaw,
    awayScoreRaw,
    advancesTeamNameRaw,
    resolutionMethodRaw,
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

  const descendantMatchNumbers = getDescendantMatchNumbers(match.matchNumber);
  const proposedResult = {
    homeScore,
    awayScore,
    advancesTeamName,
    resolutionMethod,
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
        advancesTeamName,
        resolutionMethod,
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
        resolutionMethod,
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
