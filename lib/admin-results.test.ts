import { describe, expect, it } from "vitest";
import { upsertAdminMatchResult } from "./admin-results";

function createPrismaStub(args: {
  matchNumber?: number;
  stage?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  kickoffAt: Date;
  existingResult?: { id: string } | null;
  bracketMatches?: Array<{
    id?: string;
    matchNumber: number;
    stage: string;
    homeTeamName: string;
    awayTeamName: string;
    predictions?: Array<{ id: string }>;
    result?: {
      homeScore: number;
      awayScore: number;
      advancesTeamName: string | null;
    } | null;
  }>;
}) {
  const calls = {
    create: 0,
    update: 0,
    createData: null as unknown,
    updateData: null as unknown,
  };

  return {
    calls,
    prisma: {
      match: {
        findUnique: async () => ({
          id: "match-1",
          matchNumber: args.matchNumber ?? 1,
          stage: args.stage ?? "GROUP",
          homeTeamName: args.homeTeamName ?? "Mexico",
          awayTeamName: args.awayTeamName ?? "South Africa",
          kickoffAt: args.kickoffAt,
        }),
        findMany: async () =>
          args.bracketMatches ?? [
            {
              id: "match-1",
              matchNumber: args.matchNumber ?? 1,
              stage: args.stage ?? "GROUP",
              homeTeamName: args.homeTeamName ?? "Mexico",
              awayTeamName: args.awayTeamName ?? "South Africa",
              predictions: [],
              result: null,
            },
          ],
      },
      matchResult: {
        findUnique: async () => args.existingResult ?? null,
        create: async ({ data }: { data: unknown }) => {
          calls.create += 1;
          calls.createData = data;
          return {};
        },
        update: async ({ data }: { data: unknown }) => {
          calls.update += 1;
          calls.updateData = data;
          return {};
        },
      },
    },
  };
}

describe("upsertAdminMatchResult", () => {
  it("saves a result for a started match", async () => {
    const { prisma, calls } = createPrismaStub({
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "2",
        awayScoreRaw: "1",
        advancesTeamNameRaw: null,
        resolutionMethodRaw: null,
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });
    expect(calls.create).toBe(1);
    expect(calls.createData).toMatchObject({
      createdByParticipantId: "ramiro",
      updatedByParticipantId: "ramiro",
    });
  });

  it("rejects a result for a future match", async () => {
    const { prisma, calls } = createPrismaStub({
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "2",
        awayScoreRaw: "1",
        advancesTeamNameRaw: null,
        resolutionMethodRaw: null,
        now: new Date("2026-06-14T11:59:59.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Disponible desde el inicio del partido.",
    });
    expect(calls.create).toBe(0);
    expect(calls.update).toBe(0);
  });

  it("allows saving at the exact kickoff time", async () => {
    const { prisma, calls } = createPrismaStub({
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "2",
        awayScoreRaw: "1",
        advancesTeamNameRaw: null,
        resolutionMethodRaw: null,
        now: new Date("2026-06-14T12:00:00.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });
    expect(calls.create).toBe(1);
  });

  it("preserves the creator and updates the editor when editing", async () => {
    const { prisma, calls } = createPrismaStub({
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
      existingResult: { id: "result-1" },
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "pedro",
        matchId: "match-1",
        homeScoreRaw: "3",
        awayScoreRaw: "1",
        advancesTeamNameRaw: null,
        resolutionMethodRaw: null,
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });

    expect(calls.update).toBe(1);
    expect(calls.updateData).toMatchObject({
      updatedByParticipantId: "pedro",
    });
    expect(calls.updateData).not.toHaveProperty("createdByParticipantId");
  });

  it("rejects knockout without advancing team", async () => {
    const { prisma, calls } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "",
        resolutionMethodRaw: "PENALTIES",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "En eliminación directa debés indicar qué equipo clasifica.",
    });
    expect(calls.create).toBe(0);
  });

  it("rejects knockout without resolution method", async () => {
    const { prisma } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "En eliminación directa debés indicar el método de resolución.",
    });
  });

  it("rejects non-draw knockout with non-REGULAR method", async () => {
    const { prisma } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Brazil",
      awayTeamName: "Japan",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "2",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "Brazil",
        resolutionMethodRaw: "EXTRA_TIME",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Con marcador no empatado a 90, el método debe ser REGULAR.",
    });
  });

  it("rejects draw knockout with REGULAR method", async () => {
    const { prisma } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "REGULAR",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message:
        "Con marcador empatado a 90, el método debe ser EXTRA_TIME o PENALTIES.",
    });
  });

  it("accepts draw + EXTRA_TIME + advancing team", async () => {
    const { prisma, calls } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "EXTRA_TIME",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });
    expect(calls.createData).toMatchObject({
      resolutionMethod: "EXTRA_TIME",
    });
  });

  it("accepts draw + PENALTIES + advancing team", async () => {
    const { prisma, calls } = createPrismaStub({
      stage: "ROUND_OF_32",
      homeTeamName: "Germany",
      awayTeamName: "Paraguay",
      kickoffAt: new Date("2026-06-14T12:00:00.000Z"),
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "PENALTIES",
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });
    expect(calls.createData).toMatchObject({
      resolutionMethod: "PENALTIES",
    });
  });

  it("rejects knockout writes while a slot is still unresolved", async () => {
    const { prisma, calls } = createPrismaStub({
      matchNumber: 90,
      stage: "ROUND_OF_16",
      homeTeamName: "Paraguay",
      awayTeamName: "W-32-5",
      kickoffAt: new Date("2026-07-04T18:00:00.000Z"),
      bracketMatches: [
        {
          id: "m-75",
          matchNumber: 75,
          stage: "ROUND_OF_32",
          homeTeamName: "Germany",
          awayTeamName: "Paraguay",
          predictions: [],
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Paraguay",
          },
        },
        {
          id: "m-78",
          matchNumber: 78,
          stage: "ROUND_OF_32",
          homeTeamName: "France",
          awayTeamName: "Sweden",
          predictions: [],
          result: null,
        },
        {
          id: "match-1",
          matchNumber: 90,
          stage: "ROUND_OF_16",
          homeTeamName: "Paraguay",
          awayTeamName: "W-32-5",
          predictions: [],
          result: null,
        },
      ],
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "0",
        advancesTeamNameRaw: "Paraguay",
        resolutionMethodRaw: "REGULAR",
        now: new Date("2026-07-04T18:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message:
        "Este cruce todavía depende de resultados anteriores. El resultado se habilitará cuando estén definidos ambos equipos.",
    });
    expect(calls.create).toBe(0);
    expect(calls.update).toBe(0);
  });

  it("validates advancesTeamName against effective teams instead of placeholders", async () => {
    const { prisma } = createPrismaStub({
      matchNumber: 89,
      stage: "ROUND_OF_16",
      homeTeamName: "Canada",
      awayTeamName: "Morocco",
      kickoffAt: new Date("2026-07-04T13:00:00.000Z"),
      bracketMatches: [
        {
          id: "m-73",
          matchNumber: 73,
          stage: "ROUND_OF_32",
          homeTeamName: "South Africa",
          awayTeamName: "Canada",
          predictions: [],
          result: {
            homeScore: 0,
            awayScore: 1,
            advancesTeamName: "Canada",
          },
        },
        {
          id: "m-76",
          matchNumber: 76,
          stage: "ROUND_OF_32",
          homeTeamName: "Netherlands",
          awayTeamName: "Morocco",
          predictions: [],
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Morocco",
          },
        },
        {
          id: "match-1",
          matchNumber: 89,
          stage: "ROUND_OF_16",
          homeTeamName: "Canada",
          awayTeamName: "Morocco",
          predictions: [],
          result: null,
        },
      ],
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "1",
        advancesTeamNameRaw: "W-32-4",
        resolutionMethodRaw: "PENALTIES",
        now: new Date("2026-07-04T13:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message:
        "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
    });
  });

  it("blocks changing a classified team when descendants already have activity", async () => {
    const { prisma, calls } = createPrismaStub({
      matchNumber: 73,
      stage: "ROUND_OF_32",
      homeTeamName: "South Africa",
      awayTeamName: "Canada",
      kickoffAt: new Date("2026-06-28T15:00:00.000Z"),
      existingResult: { id: "result-73" },
      bracketMatches: [
        {
          id: "match-1",
          matchNumber: 73,
          stage: "ROUND_OF_32",
          homeTeamName: "South Africa",
          awayTeamName: "Canada",
          predictions: [],
          result: {
            homeScore: 0,
            awayScore: 1,
            advancesTeamName: "Canada",
          },
        },
        {
          id: "m-76",
          matchNumber: 76,
          stage: "ROUND_OF_32",
          homeTeamName: "Netherlands",
          awayTeamName: "Morocco",
          predictions: [],
          result: {
            homeScore: 1,
            awayScore: 1,
            advancesTeamName: "Morocco",
          },
        },
        {
          id: "m-89",
          matchNumber: 89,
          stage: "ROUND_OF_16",
          homeTeamName: "Canada",
          awayTeamName: "Morocco",
          predictions: [{ id: "prediction-1" }],
          result: null,
        },
      ],
    });

    await expect(
      upsertAdminMatchResult({
        adminParticipantId: "ramiro",
        matchId: "match-1",
        homeScoreRaw: "1",
        awayScoreRaw: "0",
        advancesTeamNameRaw: "South Africa",
        resolutionMethodRaw: "REGULAR",
        now: new Date("2026-06-28T15:00:01.000Z"),
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message:
        "No se puede cambiar el clasificado porque ya existen pronósticos o resultados en partidos derivados. Corregí primero esos datos manualmente.",
    });
    expect(calls.create).toBe(0);
    expect(calls.update).toBe(0);
  });
});
