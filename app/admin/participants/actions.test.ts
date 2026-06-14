import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    setParticipantActive: vi.fn(),
    setParticipantPassword: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
    requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/admin-participants", () => ({
    setParticipantActive: mocks.setParticipantActive,
    setParticipantPassword: mocks.setParticipantPassword,
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

import {
    activateParticipantAction,
    changeParticipantPasswordAction,
    deactivateParticipantAction,
} from "./actions";

function createPasswordFormData(password: string) {
    const formData = new FormData();
    formData.set("password", password);
    return formData;
}

describe("admin participant actions auth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("does not execute without a session", async () => {
        mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(
            activateParticipantAction("pedro", { status: "idle", message: null }, new FormData()),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(mocks.setParticipantActive).not.toHaveBeenCalled();
    });

    it("does not execute for a normal participant", async () => {
        mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(
            changeParticipantPasswordAction(
                "pedro",
                { status: "idle", message: null },
                createPasswordFormData("nueva"),
            ),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(mocks.setParticipantPassword).not.toHaveBeenCalled();
    });
});

describe("admin participant actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAdmin.mockResolvedValue({
            id: "ramiro",
            name: "Ramiro",
            slug: "ramiro",
            active: true,
            isAdmin: true,
        });
    });

    it("activates a participant", async () => {
        mocks.setParticipantActive.mockResolvedValue({
            status: "success",
            message: "Usuario activado.",
        });

        await expect(
            activateParticipantAction("pedro", { status: "idle", message: null }, new FormData()),
        ).resolves.toEqual({
            status: "success",
            message: "Usuario activado.",
        });

        expect(mocks.setParticipantActive).toHaveBeenCalledWith({
            participantId: "pedro",
            active: true,
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/participants");
    });

    it("deactivates a participant", async () => {
        mocks.setParticipantActive.mockResolvedValue({
            status: "success",
            message: "Usuario desactivado.",
        });

        await expect(
            deactivateParticipantAction("pedro", { status: "idle", message: null }, new FormData()),
        ).resolves.toEqual({
            status: "success",
            message: "Usuario desactivado.",
        });

        expect(mocks.setParticipantActive).toHaveBeenCalledWith({
            participantId: "pedro",
            active: false,
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/participants");
    });

    it("changes another participant password", async () => {
        mocks.setParticipantPassword.mockResolvedValue({
            status: "success",
            message: "Contraseña actualizada.",
        });

        await expect(
            changeParticipantPasswordAction(
                "pedro",
                { status: "idle", message: null },
                createPasswordFormData("nueva"),
            ),
        ).resolves.toEqual({
            status: "success",
            message: "Contraseña actualizada.",
        });

        expect(mocks.setParticipantPassword).toHaveBeenCalledWith({
            participantId: "pedro",
            password: "nueva",
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/participants");
    });
});
