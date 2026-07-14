import type { PrismaClient } from "@prisma/client";
import { calculatePredictionScore, type ScoreBreakdown } from "./scoring";
import { getPrismaClient } from "./prisma";
import { formatParticipantName } from "./presentation";
import {
  areResolvedMatchTeamsDefined,
  buildResolvedBracketIndex,
  type BracketPropagationMatch,
  type ResolvedBracketMatch,
} from "./bracket-propagation";

export type ActiveParticipant = {
  id: string;
  name: string;
};

export type ParticipantSummary = {
  id: string;
  name: string;
  active: boolean;
};

export type MatchListItem = {
  id: string;
  matchNumber: number;
  stage: string;
  groupName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: Date;
  venue: string | null;
  city: string | null;
  isLocked: boolean;
  teamsDefined?: boolean;
};

export type ParticipantMatchListItem = MatchListItem & {
  currentPrediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  } | null;
  hasResult: boolean;
};

export type AdminResultMatchListItem = MatchListItem & {
  result: MatchResultView | null;
};

export type MatchesByDayGroup = {
  day: string;
  matches: MatchListItem[];
};

export type AdminResultsByDayGroup = {
  day: string;
  matches: AdminResultMatchListItem[];
};

export type ParticipantPredictionView = {
  participantId: string;
  participantName: string;
  status: "submitted" | "missing";
  prediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  } | null;
  score: ScoreBreakdown | null;
};

export type WorstPredictionView = {
  participantId: string;
  participantName: string;
  matchId?: string;
  matchNumber?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  result?: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  };
  prediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  };
  distance: number;
};

export type MatchResultView = {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  createdByParticipantName?: string | null;
  updatedByParticipantName?: string | null;
};

export type TournamentGoalStats = {
  totalGoals: number;
  resultedMatches: number;
  averageGoalsPerMatch: number;
};

export type StandingsStats = {
  goalStats: TournamentGoalStats;
  worstPredictions: WorstPredictionView[];
};

export type MatchReadModel = {
  match: MatchListItem;
  currentPrediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
    resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  } | null;
  isLocked: boolean;
  teamsDefined: boolean;
  canRevealPredictions: boolean;
  visiblePredictions: ParticipantPredictionView[];
  result: MatchResultView | null;
};

export type StandingsRow = {
  participantId: string;
  participantName: string;
  totalPoints: number;
  averagePoints: number;
  scoredPredictions: number;
  exactCount: number;
  outcomeCount: number;
  predictedMatches: number;
  missedLockedMatches: number;
};

type ParticipantRecord = {
  id: string;
  name: string;
};

type PredictionRecord = {
  participantId: string;
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
};

type ResultRecord = {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
  resolutionMethod?: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  createdByParticipant?: { name: string } | null;
  updatedByParticipant?: { name: string } | null;
} | null;

type MatchRecord = {
  id: string;
  matchNumber: number;
  stage: string;
  groupName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: Date;
  venue: string | null;
  city: string | null;
  teamsDefined?: boolean;
};

type MatchWithRelationsRecord = MatchRecord & {
  predictions: PredictionRecord[];
  result: ResultRecord;
};

type MatchListWithCurrentPredictionRecord = MatchRecord & {
  predictions: PredictionRecord[];
  result: ResultRecord;
};

type GoalStatsResultRecord = {
  homeScore: number;
  awayScore: number;
};

type GlobalWorstPredictionMatchRecord = {
  id: string;
  matchNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  predictions: Array<
    PredictionRecord & {
      participant: {
        name: string;
      };
    }
  >;
  result: NonNullable<ResultRecord>;
};

const matchDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizeMatchResult(result: ResultRecord): MatchResultView | null {
  if (!result) {
    return null;
  }

  return {
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    advancesTeamName: result.advancesTeamName,
    resolutionMethod: result.resolutionMethod,
    createdByParticipantName: result.createdByParticipant?.name
      ? formatParticipantName(result.createdByParticipant.name)
      : null,
    updatedByParticipantName: result.updatedByParticipant?.name
      ? formatParticipantName(result.updatedByParticipant.name)
      : null,
  };
}

function normalizePrediction(
  prediction: PredictionRecord | null | undefined,
): MatchReadModel["currentPrediction"] {
  if (!prediction) {
    return null;
  }

  return {
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    advancesTeamName: prediction.advancesTeamName,
    resolutionMethod: prediction.resolutionMethod,
  };
}

function toBracketPropagationMatch(
  match: Pick<
    MatchRecord,
    "matchNumber" | "stage" | "homeTeamName" | "awayTeamName"
  > & {
    result?: ResultRecord;
  },
): BracketPropagationMatch {
  return {
    matchNumber: match.matchNumber,
    stage: match.stage,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    result: match.result
      ? {
        homeScore: match.result.homeScore,
        awayScore: match.result.awayScore,
        advancesTeamName: match.result.advancesTeamName,
        resolutionMethod: match.result.resolutionMethod ?? null,
      }
      : null,
  };
}

function applyEffectiveTeamsToMatch<T extends MatchRecord & { result?: ResultRecord }>(
  match: T,
  resolvedByMatchNumber: Map<number, ResolvedBracketMatch>,
): T {
  const resolvedMatch = resolvedByMatchNumber.get(match.matchNumber);

  if (!resolvedMatch) {
    return match;
  }

  return {
    ...match,
    homeTeamName: resolvedMatch.homeSlot.effectiveName,
    awayTeamName: resolvedMatch.awaySlot.effectiveName,
    teamsDefined: areResolvedMatchTeamsDefined(resolvedMatch),
  };
}

function buildResolvedMatches<T extends MatchRecord & { result?: ResultRecord }>(
  matches: T[],
): T[] {
  const resolvedByMatchNumber = buildResolvedBracketIndex(
    matches.map((match) => toBracketPropagationMatch(match)),
  );

  return matches.map((match) => applyEffectiveTeamsToMatch(match, resolvedByMatchNumber));
}

export function isMatchLocked(kickoffAt: Date, now: Date): boolean {
  return kickoffAt.getTime() <= now.getTime();
}

export function getMatchDay(kickoffAt: Date): string {
  return matchDayFormatter.format(kickoffAt);
}

export function toMatchListItem(match: MatchRecord, now: Date): MatchListItem {
  const matchListItem: MatchListItem = {
    ...match,
    isLocked: isMatchLocked(match.kickoffAt, now),
  };

  if (typeof match.teamsDefined === "boolean") {
    matchListItem.teamsDefined = match.teamsDefined;
  }

  return matchListItem;
}

export function toParticipantMatchListItem(args: {
  match: MatchListWithCurrentPredictionRecord;
  participantId: string;
  now: Date;
}): ParticipantMatchListItem {
  const { match, participantId, now } = args;
  const currentPrediction = match.predictions.find(
    (prediction) => prediction.participantId === participantId,
  );

  return {
    ...toMatchListItem(match, now),
    currentPrediction: normalizePrediction(currentPrediction),
    hasResult: match.result !== null,
  };
}

export function groupMatchesByDay(matches: MatchListItem[]): MatchesByDayGroup[] {
  const groupedMatches = new Map<string, MatchListItem[]>();

  for (const match of matches) {
    const day = getMatchDay(match.kickoffAt);
    const existingMatches = groupedMatches.get(day);

    if (existingMatches) {
      existingMatches.push(match);
      continue;
    }

    groupedMatches.set(day, [match]);
  }

  return [...groupedMatches.entries()].map(([day, dayMatches]) => ({
    day,
    matches: dayMatches,
  }));
}

export function groupAdminMatchesByDay(
  matches: AdminResultMatchListItem[],
): AdminResultsByDayGroup[] {
  const groupedMatches = new Map<string, AdminResultMatchListItem[]>();

  for (const match of matches) {
    const day = getMatchDay(match.kickoffAt);
    const existingMatches = groupedMatches.get(day);

    if (existingMatches) {
      existingMatches.push(match);
      continue;
    }

    groupedMatches.set(day, [match]);
  }

  return [...groupedMatches.entries()].map(([day, dayMatches]) => ({
    day,
    matches: dayMatches,
  }));
}

export function buildVisiblePredictions(args: {
  match: Pick<MatchWithRelationsRecord, "stage" | "result" | "predictions">;
  participants: ParticipantRecord[];
  canRevealPredictions: boolean;
}): ParticipantPredictionView[] {
  const { match, participants, canRevealPredictions } = args;

  if (!canRevealPredictions) {
    return [];
  }

  const predictionByParticipantId = new Map(
    match.predictions.map((prediction) => [prediction.participantId, prediction]),
  );

  return participants.map((participant) => {
    const prediction = predictionByParticipantId.get(participant.id);
    const score = match.result
      ? calculatePredictionScore(
        prediction
          ? {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            advancesTeamName: prediction.advancesTeamName,
            resolutionMethod: prediction.resolutionMethod,
          }
          : null,
        {
          homeScore: match.result.homeScore,
          awayScore: match.result.awayScore,
          advancesTeamName: match.result.advancesTeamName,
          resolutionMethod: match.result.resolutionMethod,
        },
        { stage: match.stage },
      )
      : null;

    return {
      participantId: participant.id,
      participantName: formatParticipantName(participant.name),
      status: prediction ? "submitted" : "missing",
      prediction: normalizePrediction(prediction),
      score,
    };
  });
}

export function buildTournamentGoalStats(
  results: GoalStatsResultRecord[],
): TournamentGoalStats {
  const totalGoals = results.reduce(
    (sum, result) => sum + result.homeScore + result.awayScore,
    0,
  );
  const resultedMatches = results.length;

  return {
    totalGoals,
    resultedMatches,
    averageGoalsPerMatch: resultedMatches > 0 ? totalGoals / resultedMatches : 0,
  };
}

export async function getTournamentGoalStats(
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<TournamentGoalStats> {
  const results = await prismaClient.matchResult.findMany({
    select: {
      homeScore: true,
      awayScore: true,
    },
  });

  return buildTournamentGoalStats(results);
}

export function buildGlobalWorstPredictions(
  matches: GlobalWorstPredictionMatchRecord[],
): WorstPredictionView[] {
  const predictionsWithDistance = matches.flatMap((match) =>
    match.predictions.map((prediction) => ({
      participantId: prediction.participantId,
      participantName: formatParticipantName(prediction.participant.name),
      matchId: match.id,
      matchNumber: match.matchNumber,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      result: {
        homeScore: match.result.homeScore,
        awayScore: match.result.awayScore,
        advancesTeamName: match.result.advancesTeamName,
        resolutionMethod: match.result.resolutionMethod,
      },
      prediction: {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancesTeamName: prediction.advancesTeamName,
        resolutionMethod: prediction.resolutionMethod,
      },
      distance:
        Math.abs(prediction.homeScore - match.result.homeScore) +
        Math.abs(prediction.awayScore - match.result.awayScore),
    })),
  );

  if (predictionsWithDistance.length === 0) {
    return [];
  }

  const worstDistance = Math.max(
    ...predictionsWithDistance.map((prediction) => prediction.distance),
  );

  return predictionsWithDistance.filter((prediction) => prediction.distance === worstDistance);
}

export async function getStandingsStats(
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<StandingsStats> {
  const [goalStats, matches] = await Promise.all([
    getTournamentGoalStats(prismaClient),
    prismaClient.match.findMany({
      where: {
        result: {
          isNot: null,
        },
      },
      orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
      select: {
        id: true,
        matchNumber: true,
        homeTeamName: true,
        awayTeamName: true,
        predictions: {
          select: {
            participantId: true,
            homeScore: true,
            awayScore: true,
            advancesTeamName: true,
            resolutionMethod: true,
            participant: {
              select: {
                name: true,
              },
            },
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
    }),
  ]);

  return {
    goalStats,
    worstPredictions: buildGlobalWorstPredictions(
      matches.filter((match) => match.result !== null) as GlobalWorstPredictionMatchRecord[],
    ),
  };
}

export function buildMatchReadModel(args: {
  match: MatchWithRelationsRecord;
  participants: ParticipantRecord[];
  currentParticipantName: string;
  now: Date;
}): MatchReadModel {
  const { match, participants, currentParticipantName, now } = args;
  const currentParticipant = participants.find(
    (participant) => participant.name === currentParticipantName,
  );

  if (!currentParticipant) {
    throw new Error(`Active participant not found: ${currentParticipantName}`);
  }

  const currentPrediction = match.predictions.find(
    (prediction) => prediction.participantId === currentParticipant.id,
  );
  const matchListItem = toMatchListItem(match, now);
  const canRevealPredictions = matchListItem.isLocked;

  return {
    match: matchListItem,
    currentPrediction: normalizePrediction(currentPrediction),
    isLocked: matchListItem.isLocked,
    teamsDefined: match.teamsDefined ?? true,
    canRevealPredictions,
    visiblePredictions: buildVisiblePredictions({
      match,
      participants,
      canRevealPredictions,
    }),
    result: normalizeMatchResult(match.result),
  };
}

export function buildStandingsTable(args: {
  participants: ParticipantRecord[];
  matches: MatchWithRelationsRecord[];
  now: Date;
}): StandingsRow[] {
  const { participants, matches, now } = args;

  const rows = participants.map((participant) => {
    let totalPoints = 0;
    let scoredPredictions = 0;
    let exactCount = 0;
    let outcomeCount = 0;
    let predictedMatches = 0;
    let missedLockedMatches = 0;

    for (const match of matches) {
      const prediction = match.predictions.find(
        (matchPrediction) => matchPrediction.participantId === participant.id,
      );

      if (prediction) {
        predictedMatches += 1;
      } else if (isMatchLocked(match.kickoffAt, now)) {
        missedLockedMatches += 1;
      }

      if (prediction && match.result) {
        scoredPredictions += 1;
      }

      const score = calculatePredictionScore(
        prediction
          ? {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            advancesTeamName: prediction.advancesTeamName,
            resolutionMethod: prediction.resolutionMethod,
          }
          : null,
        match.result
          ? {
            homeScore: match.result.homeScore,
            awayScore: match.result.awayScore,
            advancesTeamName: match.result.advancesTeamName,
            resolutionMethod: match.result.resolutionMethod,
          }
          : null,
        { stage: match.stage },
      );

      totalPoints += score.total;

      if (score.exactScore > 0) {
        exactCount += 1;
      }

      if (score.outcome > 0) {
        outcomeCount += 1;
      }
    }

    return {
      participantId: participant.id,
      participantName: formatParticipantName(participant.name),
      totalPoints,
      averagePoints: scoredPredictions > 0 ? totalPoints / scoredPredictions : 0,
      scoredPredictions,
      exactCount,
      outcomeCount,
      predictedMatches,
      missedLockedMatches,
    };
  });

  return rows.sort((left, right) => {
    if (right.averagePoints !== left.averagePoints) {
      return right.averagePoints - left.averagePoints;
    }

    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if (right.exactCount !== left.exactCount) {
      return right.exactCount - left.exactCount;
    }

    if (right.outcomeCount !== left.outcomeCount) {
      return right.outcomeCount - left.outcomeCount;
    }

    return left.participantName.localeCompare(right.participantName);
  });
}

export async function listActiveParticipants(
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<ActiveParticipant[]> {
  const participants = await prismaClient.participant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return participants.map((participant) => ({
    ...participant,
    name: formatParticipantName(participant.name),
  }));
}

export async function getParticipantById(
  participantId: string,
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<ParticipantSummary | null> {
  const participant = await prismaClient.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      name: true,
      active: true,
    },
  });

  return participant
    ? {
      ...participant,
      name: formatParticipantName(participant.name),
    }
    : null;
}

export async function getMatchesGroupedByDay(
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<MatchesByDayGroup[]> {
  const matches = await prismaClient.match.findMany({
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      groupName: true,
      homeTeamName: true,
      awayTeamName: true,
      kickoffAt: true,
      venue: true,
      city: true,
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

  return groupMatchesByDay(
    buildResolvedMatches(matches).map((match) => toMatchListItem(match, now)),
  );
}

export async function getMatchesByGroup(
  groupName: string,
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<MatchListItem[]> {
  const matches = await prismaClient.match.findMany({
    where: { groupName },
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      groupName: true,
      homeTeamName: true,
      awayTeamName: true,
      kickoffAt: true,
      venue: true,
      city: true,
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

  return buildResolvedMatches(matches).map((match) => toMatchListItem(match, now));
}

export async function getParticipantMatches(
  participantId: string,
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<ParticipantMatchListItem[]> {
  const matches = await prismaClient.match.findMany({
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      groupName: true,
      homeTeamName: true,
      awayTeamName: true,
      kickoffAt: true,
      venue: true,
      city: true,
      predictions: {
        where: { participantId },
        select: {
          participantId: true,
          homeScore: true,
          awayScore: true,
          advancesTeamName: true,
          resolutionMethod: true,
        },
      },
      result: {
        select: {
          homeScore: true,
          awayScore: true,
          advancesTeamName: true,
          resolutionMethod: true,
          createdByParticipant: {
            select: {
              name: true,
            },
          },
          updatedByParticipant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return buildResolvedMatches(matches).map((match) =>
    toParticipantMatchListItem({
      match,
      participantId,
      now,
    }),
  );
}

export async function getMatchReadModelById(
  matchId: string,
  currentParticipantId: string,
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<MatchReadModel | null> {
  const [participants, match, bracketMatches] = await Promise.all([
    prismaClient.participant.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prismaClient.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        matchNumber: true,
        stage: true,
        groupName: true,
        homeTeamName: true,
        awayTeamName: true,
        kickoffAt: true,
        venue: true,
        city: true,
        predictions: {
          select: {
            participantId: true,
            homeScore: true,
            awayScore: true,
            advancesTeamName: true,
            resolutionMethod: true,
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
    }),
    prismaClient.match.findMany({
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
    }),
  ]);

  if (!match) {
    return null;
  }

  const currentParticipant = participants.find(
    (participant) => participant.id === currentParticipantId,
  );
  if (!currentParticipant) {
    throw new Error(`Active participant not found: ${currentParticipantId}`);
  }

  const resolvedByMatchNumber = buildResolvedBracketIndex(
    bracketMatches.map((bracketMatch) => toBracketPropagationMatch(bracketMatch)),
  );
  const resolvedMatch = applyEffectiveTeamsToMatch(
    match as MatchWithRelationsRecord,
    resolvedByMatchNumber,
  );

  return buildMatchReadModel({
    match: resolvedMatch,
    participants,
    currentParticipantName: currentParticipant.name,
    now,
  });
}

export async function getStandingsTable(
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<StandingsRow[]> {
  const [participants, matches] = await Promise.all([
    prismaClient.participant.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prismaClient.match.findMany({
      orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
      select: {
        id: true,
        matchNumber: true,
        stage: true,
        groupName: true,
        homeTeamName: true,
        awayTeamName: true,
        kickoffAt: true,
        venue: true,
        city: true,
        predictions: {
          select: {
            participantId: true,
            homeScore: true,
            awayScore: true,
            advancesTeamName: true,
            resolutionMethod: true,
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
    }),
  ]);

  return buildStandingsTable({
    participants,
    matches,
    now,
  });
}

export async function getAdminResultsGroupedByDay(
  now: Date = new Date(),
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<AdminResultsByDayGroup[]> {
  const matches = await prismaClient.match.findMany({
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      groupName: true,
      homeTeamName: true,
      awayTeamName: true,
      kickoffAt: true,
      venue: true,
      city: true,
      result: {
        select: {
          homeScore: true,
          awayScore: true,
          advancesTeamName: true,
          resolutionMethod: true,
          createdByParticipant: {
            select: {
              name: true,
            },
          },
          updatedByParticipant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const adminMatches: AdminResultMatchListItem[] = buildResolvedMatches(matches).map((match) => ({
    ...toMatchListItem(match, now),
    result: normalizeMatchResult(match.result),
  }));

  return groupAdminMatchesByDay(adminMatches);
}
