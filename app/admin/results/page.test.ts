import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    getAdminResultsGroupedByDay: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/read-models", () => ({
    getAdminResultsGroupedByDay: mocks.getAdminResultsGroupedByDay,
}));

vi.mock("@/components/local-date-time", () => ({
    LocalDateTime: () => null,
}));

vi.mock("@/components/result-form", () => ({
    ResultForm: () => null,
}));

vi.mock("@/lib/date-format", () => ({
    formatMatchDayLabel: () => "14 jun",
}));

vi.mock("@/lib/presentation", () => ({
    formatResultSummary: () => "Sin resultado",
    formatResultTrace: () => null,
    formatStageLabel: (value: string) => value,
}));

vi.mock("./actions", () => ({
    upsertMatchResultAction: vi.fn(),
}));

import AdminResultsPage from "./page";

describe("AdminResultsPage auth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects without a session", async () => {
        mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(AdminResultsPage()).rejects.toThrow("NEXT_REDIRECT");
        expect(mocks.getAdminResultsGroupedByDay).not.toHaveBeenCalled();
    });

    it("redirects a normal participant", async () => {
        mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(AdminResultsPage()).rejects.toThrow("NEXT_REDIRECT");
        expect(mocks.getAdminResultsGroupedByDay).not.toHaveBeenCalled();
    });

    it("allows an admin to access the page", async () => {
        mocks.requireAdmin.mockResolvedValue({
            id: "ramiro",
            name: "Ramiro",
            slug: "ramiro",
            active: true,
            isAdmin: true,
        });
        mocks.getAdminResultsGroupedByDay.mockResolvedValue([]);

        await expect(AdminResultsPage()).resolves.toBeTruthy();
        expect(mocks.getAdminResultsGroupedByDay).toHaveBeenCalled();
    });
});
