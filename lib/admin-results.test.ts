import { describe, expect, it } from "vitest";
import { upsertAdminMatchResult } from "./admin-results";

function createPrismaStub(args: {
  kickoffAt: Date;
  existingResult?: { id: string } | null;
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
          stage: "GROUP",
          kickoffAt: args.kickoffAt,
        }),
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
});
