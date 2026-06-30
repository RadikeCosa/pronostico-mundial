import { describe, expect, it, vi } from "vitest";

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
  validateKnockoutWriteValues: vi.fn(() => ({
    advancesTeamName: null,
    resolutionMethod: null,
    error: null,
  })),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentParticipant: mocks.getCurrentParticipant,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: mocks.getPrismaClient,
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
  it("does not allow saving a prediction as another participant", async () => {
    mocks.getCurrentParticipant.mockResolvedValue(mocks.currentParticipant);

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
});
