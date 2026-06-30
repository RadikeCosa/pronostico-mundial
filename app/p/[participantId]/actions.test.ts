import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentParticipant: {
    id: "pedro",
    name: "Pedro",
    slug: "pedro",
    active: true,
    isAdmin: false,
  },
  getCurrentParticipant: vi.fn(),
  getPrismaClient: vi.fn(),
  isMatchLocked: vi.fn(),
  buildResolvedBracketIndex: vi.fn(),
  areResolvedMatchTeamsDefined: vi.fn(),
  validateKnockoutWriteValues: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentParticipant: mocks.getCurrentParticipant,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

vi.mock("@/lib/bracket-propagation", () => ({
  buildResolvedBracketIndex: mocks.buildResolvedBracketIndex,
  areResolvedMatchTeamsDefined: mocks.areResolvedMatchTeamsDefined,
}));

vi.mock("@/lib/read-models", () => ({
  isMatchLocked: mocks.isMatchLocked,
}));

vi.mock("@/lib/knockout-validation", () => ({
  validateKnockoutWriteValues: mocks.validateKnockoutWriteValues,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { upsertPredictionAction } from "./actions";

describe("upsertPredictionAction auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentParticipant.mockResolvedValue(mocks.currentParticipant);
    mocks.isMatchLocked.mockReturnValue(false);
    mocks.buildResolvedBracketIndex.mockReturnValue(
      new Map([
        [
          89,
          {
            homeSlot: { effectiveName: "Canada" },
            awaySlot: { effectiveName: "Morocco" },
          },
        ],
        [
          90,
          {
            homeSlot: { effectiveName: "Paraguay" },
            awaySlot: { effectiveName: "W-32-5" },
          },
        ],
      ]),
    );
    mocks.areResolvedMatchTeamsDefined.mockReturnValue(true);
    mocks.validateKnockoutWriteValues.mockReturnValue({
      status: "success",
      values: {
        advancesTeamName: null,
        resolutionMethod: null,
      },
    });
  });

  it("does not allow saving a prediction as another participant", async () => {
    const result = await upsertPredictionAction(
      "ramiro",
      "match-1",
      { status: "idle", message: null },
      new FormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "No podés guardar pronósticos de otro participante.",
    });
    expect(mocks.getPrismaClient).not.toHaveBeenCalled();
  });

  it("validates knockout predictions against effective teams instead of placeholders", async () => {
    const predictionCreate = vi.fn(async () => ({}));

    mocks.getPrismaClient.mockReturnValue({
      participant: {
        findUnique: async () => ({ id: "pedro", active: true }),
      },
      match: {
        findUnique: async () => ({
          id: "match-1",
          matchNumber: 89,
          stage: "ROUND_OF_16",
          homeTeamName: "Canada",
          awayTeamName: "Morocco",
          kickoffAt: new Date("2026-07-04T17:00:00.000Z"),
        }),
        findMany: async () => [
          {
            matchNumber: 73,
            stage: "ROUND_OF_32",
            homeTeamName: "South Africa",
            awayTeamName: "Canada",
            result: {
              homeScore: 0,
              awayScore: 1,
              advancesTeamName: "Canada",
            },
          },
          {
            matchNumber: 76,
            stage: "ROUND_OF_32",
            homeTeamName: "Netherlands",
            awayTeamName: "Morocco",
            result: {
              homeScore: 1,
              awayScore: 1,
              advancesTeamName: "Morocco",
            },
          },
          {
            matchNumber: 89,
            stage: "ROUND_OF_16",
            homeTeamName: "Canada",
            awayTeamName: "Morocco",
            result: null,
          },
        ],
      },
      prediction: {
        findUnique: async () => null,
        create: predictionCreate,
      },
    });
    mocks.validateKnockoutWriteValues.mockReturnValueOnce({
      status: "error",
      message:
        "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
    });

    const formData = new FormData();
    formData.set("homeScore", "1");
    formData.set("awayScore", "1");
    formData.set("advancesTeamName", "W-32-4");
    formData.set("resolutionMethod", "PENALTIES");

    const result = await upsertPredictionAction(
      "pedro",
      "match-1",
      { status: "idle", message: null },
      formData,
    );

    expect(result).toEqual({
      status: "error",
      message:
        "El equipo clasificado debe coincidir con uno de los dos equipos del partido.",
    });
    expect(mocks.validateKnockoutWriteValues).toHaveBeenCalledWith(
      expect.objectContaining({
        homeTeamName: "Canada",
        awayTeamName: "Morocco",
      }),
    );
    expect(predictionCreate).not.toHaveBeenCalled();
  });

  it("blocks predictions when the knockout slot is still unresolved", async () => {
    mocks.getPrismaClient.mockReturnValue({
      participant: {
        findUnique: async () => ({ id: "pedro", active: true }),
      },
      match: {
        findUnique: async () => ({
          id: "match-1",
          matchNumber: 90,
          stage: "ROUND_OF_16",
          homeTeamName: "Paraguay",
          awayTeamName: "W-32-5",
          kickoffAt: new Date("2026-07-04T21:00:00.000Z"),
        }),
        findMany: async () => [
          {
            matchNumber: 75,
            stage: "ROUND_OF_32",
            homeTeamName: "Germany",
            awayTeamName: "Paraguay",
            result: {
              homeScore: 1,
              awayScore: 1,
              advancesTeamName: "Paraguay",
            },
          },
          {
            matchNumber: 78,
            stage: "ROUND_OF_32",
            homeTeamName: "France",
            awayTeamName: "Sweden",
            result: null,
          },
          {
            matchNumber: 90,
            stage: "ROUND_OF_16",
            homeTeamName: "Paraguay",
            awayTeamName: "W-32-5",
            result: null,
          },
        ],
      },
      prediction: {
        findUnique: async () => null,
        create: async () => ({}),
      },
    });
    mocks.areResolvedMatchTeamsDefined.mockReturnValueOnce(false);

    const result = await upsertPredictionAction(
      "pedro",
      "match-1",
      { status: "idle", message: null },
      new FormData(),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Este cruce todavía depende de resultados anteriores. El pronóstico se habilitará cuando estén definidos ambos equipos.",
    });
    expect(mocks.validateKnockoutWriteValues).not.toHaveBeenCalled();
  });
});
