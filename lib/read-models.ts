import type { PrismaClient } from "@prisma/client";
import { calculatePredictionScore, type ScoreBreakdown } from "./scoring";
import { getPrismaClient } from "./prisma";

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
};

export type ParticipantMatchListItem = MatchListItem & {
  currentPrediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
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
  } | null;
  score: ScoreBreakdown | null;
};

export type MatchResultView = {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
};

export type MatchReadModel = {
  match: MatchListItem;
  currentPrediction: {
    homeScore: number;
    awayScore: number;
    advancesTeamName: string | null;
  } | null;
  isLocked: boolean;
  canRevealPredictions: boolean;
  visiblePredictions: ParticipantPredictionView[];
  result: MatchResultView | null;
};

export type StandingsRow = {
  participantId: string;
  participantName: string;
  totalPoints: number;
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
};

type ResultRecord = {
  homeScore: number;
  awayScore: number;
  advancesTeamName: string | null;
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
};

type MatchWithRelationsRecord = MatchRecord & {
  predictions: PredictionRecord[];
  result: ResultRecord;
};

type MatchListWithCurrentPredictionRecord = MatchRecord & {
  predictions: PredictionRecord[];
  result: ResultRecord;
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
  };
}

export function isMatchLocked(kickoffAt: Date, now: Date): boolean {
  return kickoffAt.getTime() <= now.getTime();
}

export function getMatchDay(kickoffAt: Date): string {
  return matchDayFormatter.format(kickoffAt);
}

export function toMatchListItem(match: MatchRecord, now: Date): MatchListItem {
  return {
    ...match,
    isLocked: isMatchLocked(match.kickoffAt, now),
  };
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
              }
            : null,
          {
            homeScore: match.result.homeScore,
            awayScore: match.result.awayScore,
            advancesTeamName: match.result.advancesTeamName,
          },
          { stage: match.stage },
        )
      : null;

    return {
      participantId: participant.id,
      participantName: participant.name,
      status: prediction ? "submitted" : "missing",
      prediction: normalizePrediction(prediction),
      score,
    };
  });
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

      const score = calculatePredictionScore(
        prediction
          ? {
              homeScore: prediction.homeScore,
              awayScore: prediction.awayScore,
              advancesTeamName: prediction.advancesTeamName,
            }
          : null,
        match.result
          ? {
              homeScore: match.result.homeScore,
              awayScore: match.result.awayScore,
              advancesTeamName: match.result.advancesTeamName,
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
      participantName: participant.name,
      totalPoints,
      exactCount,
      outcomeCount,
      predictedMatches,
      missedLockedMatches,
    };
  });

  return rows.sort((left, right) => {
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
  return prismaClient.participant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getParticipantById(
  participantId: string,
  prismaClient: PrismaClient = getPrismaClient(),
): Promise<ParticipantSummary | null> {
  return prismaClient.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      name: true,
      active: true,
    },
  });
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
    },
  });

  return groupMatchesByDay(matches.map((match) => toMatchListItem(match, now)));
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
    },
  });

  return matches.map((match) => toMatchListItem(match, now));
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
  });

  return matches.map((match) =>
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
  const [participants, match] = await Promise.all([
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

  return buildMatchReadModel({
    match,
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
        },
      },
    },
  });

  const adminMatches: AdminResultMatchListItem[] = matches.map((match) => ({
    ...toMatchListItem(match, now),
    result: normalizeMatchResult(match.result),
  }));

  return groupAdminMatchesByDay(adminMatches);
}
