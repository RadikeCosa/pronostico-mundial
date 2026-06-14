import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { MatchStage, PrismaClient } from "@prisma/client";

type FixtureTeam = {
  name: string;
  code: string;
  groupName?: string;
};

type FixtureMatch = {
  matchNumber: number;
  stage: string;
  groupName?: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  venue?: string;
  city?: string;
};

type FixtureData = {
  teams: FixtureTeam[];
  matches: FixtureMatch[];
};

type HistoricalPrediction = {
  participantName: string;
  matchNumber: number;
  homeScore: number;
  awayScore: number;
  advancesTeamName?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the Prisma seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PARTICIPANTS = ["Ramiro", "Pedro"] as const;

const HISTORICAL_PREDICTIONS: HistoricalPrediction[] = [
  { participantName: "Pedro", matchNumber: 1, homeScore: 1, awayScore: 0 },
  { participantName: "Ramiro", matchNumber: 1, homeScore: 1, awayScore: 1 },
  { participantName: "Pedro", matchNumber: 2, homeScore: 2, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 2, homeScore: 2, awayScore: 3 },
  { participantName: "Pedro", matchNumber: 3, homeScore: 1, awayScore: 2 },
  { participantName: "Ramiro", matchNumber: 3, homeScore: 2, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 4, homeScore: 2, awayScore: 0 },
  { participantName: "Pedro", matchNumber: 4, homeScore: 0, awayScore: 1 },
  { participantName: "Pedro", matchNumber: 5, homeScore: 1, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 5, homeScore: 3, awayScore: 2 },
  { participantName: "Pedro", matchNumber: 6, homeScore: 1, awayScore: 1 },
  { participantName: "Ramiro", matchNumber: 6, homeScore: 0, awayScore: 2 },
  { participantName: "Ramiro", matchNumber: 7, homeScore: 0, awayScore: 3 },
  { participantName: "Pedro", matchNumber: 7, homeScore: 0, awayScore: 2 },
];

const STAGE_MAP: Record<string, MatchStage> = {
  Group: MatchStage.GROUP,
  "Round of 32": MatchStage.ROUND_OF_32,
  "Round of 16": MatchStage.ROUND_OF_16,
  Quarterfinal: MatchStage.QUARTERFINAL,
  Semifinal: MatchStage.SEMIFINAL,
  "Third Place": MatchStage.THIRD_PLACE,
  Final: MatchStage.FINAL,
};

function loadFixture(): FixtureData {
  const fixturePath = resolve(process.cwd(), "prisma/seed-data/fixture.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureData;
}

async function main() {
  const fixture = loadFixture();

  for (const participantName of PARTICIPANTS) {
    await prisma.participant.upsert({
      where: { name: participantName },
      update: { active: true },
      create: { name: participantName, active: true },
    });
  }

  for (const team of fixture.teams) {
    await prisma.team.upsert({
      where: { code: team.code },
      update: {
        name: team.name,
        groupName: team.groupName ?? null,
      },
      create: {
        name: team.name,
        code: team.code,
        groupName: team.groupName ?? null,
      },
    });
  }

  const teams = await prisma.team.findMany();
  const teamByName = new Map(teams.map((team) => [team.name, team]));

  for (const match of fixture.matches) {
    const homeTeam = teamByName.get(match.homeTeam);
    const awayTeam = teamByName.get(match.awayTeam);
    const stage = STAGE_MAP[match.stage];

    if (!stage) {
      throw new Error(`Unsupported match stage: ${match.stage}`);
    }

    await prisma.match.upsert({
      where: { matchNumber: match.matchNumber },
      update: {
        stage,
        groupName: match.groupName ?? null,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeTeamId: homeTeam?.id ?? null,
        awayTeamId: awayTeam?.id ?? null,
        kickoffAt: new Date(match.kickoffAt),
        venue: match.venue ?? null,
        city: match.city ?? null,
      },
      create: {
        matchNumber: match.matchNumber,
        stage,
        groupName: match.groupName ?? null,
        homeTeamName: match.homeTeam,
        awayTeamName: match.awayTeam,
        homeTeamId: homeTeam?.id ?? null,
        awayTeamId: awayTeam?.id ?? null,
        kickoffAt: new Date(match.kickoffAt),
        venue: match.venue ?? null,
        city: match.city ?? null,
      },
    });
  }

  const participants = await prisma.participant.findMany();
  const participantByName = new Map(
    participants.map((participant) => [participant.name, participant]),
  );
  const matches = await prisma.match.findMany({
    where: {
      matchNumber: {
        in: HISTORICAL_PREDICTIONS.map((prediction) => prediction.matchNumber),
      },
    },
  });
  const matchByNumber = new Map(matches.map((match) => [match.matchNumber, match]));

  for (const prediction of HISTORICAL_PREDICTIONS) {
    const participant = participantByName.get(prediction.participantName);
    const match = matchByNumber.get(prediction.matchNumber);

    if (!participant || !match) {
      throw new Error(
        `Missing participant or match for seed prediction ${prediction.participantName} / ${prediction.matchNumber}`,
      );
    }

    await prisma.prediction.upsert({
      where: {
        participantId_matchId: {
          participantId: participant.id,
          matchId: match.id,
        },
      },
      update: {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancesTeamName: prediction.advancesTeamName ?? null,
      },
      create: {
        participantId: participant.id,
        matchId: match.id,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        advancesTeamName: prediction.advancesTeamName ?? null,
      },
    });
  }

  console.log(
    `Seed complete: ${fixture.teams.length} teams, ${fixture.matches.length} matches, ${HISTORICAL_PREDICTIONS.length} predictions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
