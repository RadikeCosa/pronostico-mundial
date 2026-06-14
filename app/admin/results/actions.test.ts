import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  upsertAdminMatchResult: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/admin-results", () => ({
  upsertAdminMatchResult: mocks.upsertAdminMatchResult,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { upsertMatchResultAction } from "./actions";

function createResultFormData() {
  const formData = new FormData();
  formData.set("homeScore", "2");
  formData.set("awayScore", "1");
  return formData;
}

describe("upsertMatchResultAction auth", () => {
  it("does not execute for a normal non-admin participant", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      upsertMatchResultAction(
        "match-1",
        { status: "idle", message: null },
        createResultFormData(),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.upsertAdminMatchResult).not.toHaveBeenCalled();
  });

  it("does not execute without a session", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      upsertMatchResultAction(
        "match-1",
        { status: "idle", message: null },
        createResultFormData(),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.upsertAdminMatchResult).not.toHaveBeenCalled();
  });

  it("executes for an admin participant", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "ramiro",
      name: "Ramiro",
      slug: "ramiro",
      active: true,
      isAdmin: true,
    });
    mocks.upsertAdminMatchResult.mockResolvedValue({
      status: "success",
      message: "Resultado guardado.",
    });

    await expect(
      upsertMatchResultAction(
        "match-1",
        { status: "idle", message: null },
        createResultFormData(),
      ),
    ).resolves.toEqual({
      status: "success",
      message: "Resultado guardado.",
    });
    expect(mocks.upsertAdminMatchResult).toHaveBeenCalledWith({
      adminParticipantId: "ramiro",
      matchId: "match-1",
      homeScoreRaw: "2",
      awayScoreRaw: "1",
      advancesTeamNameRaw: null,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/results");
  });
});
