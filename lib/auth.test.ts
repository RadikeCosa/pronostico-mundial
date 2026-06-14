import { describe, expect, it } from "vitest";
import { changeParticipantPassword } from "./auth/change-password";
import { authenticateParticipant } from "./auth/login";
import { hashPassword, verifyPassword } from "./auth/password";
import {
  createSessionToken,
  getCurrentParticipant,
  requireAdmin,
  requireParticipant,
  verifySessionToken,
} from "./auth/session";

function createPrismaStub(participant: unknown) {
  return {
    participant: {
      findFirst: async () => participant,
      findUnique: async () => participant,
    },
  };
}

function createMutableParticipantPrisma(participant: {
  id: string;
  active: boolean;
  passwordHash: string | null;
}) {
  return {
    participant: {
      findFirst: async () => participant,
      findUnique: async () => participant,
      update: async ({ data }: { data: { passwordHash?: string } }) => {
        if (data.passwordHash !== undefined) {
          participant.passwordHash = data.passwordHash;
        }

        return participant;
      },
    },
  };
}

describe("password auth", () => {
  it("hashes and verifies a password without storing it in plain text", async () => {
    const password = "familiar-segura";
    const passwordHash = await hashPassword(password, { iterations: 1_000 });

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("otra", passwordHash)).resolves.toBe(false);
  });
});

describe("participant login", () => {
  it("authenticates an active participant with the right password", async () => {
    const passwordHash = await hashPassword("ramiro-pass", { iterations: 1_000 });
    const participant = {
      id: "ramiro",
      active: true,
      passwordHash,
    };

    await expect(
      authenticateParticipant(
        "Ramiro",
        "ramiro-pass",
        createPrismaStub(participant) as never,
      ),
    ).resolves.toEqual(participant);
  });

  it("rejects a wrong password", async () => {
    const passwordHash = await hashPassword("ramiro-pass", { iterations: 1_000 });

    await expect(
      authenticateParticipant(
        "Ramiro",
        "mal",
        createPrismaStub({ id: "ramiro", active: true, passwordHash }) as never,
      ),
    ).resolves.toBeNull();
  });

  it("rejects an unknown participant", async () => {
    await expect(
      authenticateParticipant("Nadie", "pass", createPrismaStub(null) as never),
    ).resolves.toBeNull();
  });

  it("rejects an inactive participant", async () => {
    const passwordHash = await hashPassword("pedro-pass", { iterations: 1_000 });

    await expect(
      authenticateParticipant(
        "Pedro",
        "pedro-pass",
        createPrismaStub({ id: "pedro", active: false, passwordHash }) as never,
      ),
    ).resolves.toBeNull();
  });
});

describe("session helpers", () => {
  it("reads the current participant from a valid signed session", async () => {
    const token = createSessionToken("ramiro", new Date("2026-06-14T12:00:00.000Z"));
    const participant = {
      id: "ramiro",
      name: "Ramiro",
      slug: "ramiro",
      active: true,
      isAdmin: true,
    };

    await expect(
      getCurrentParticipant({
        cookieValue: token,
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: createPrismaStub(participant) as never,
      }),
    ).resolves.toEqual(participant);
  });

  it("returns null for an expired session", () => {
    const token = createSessionToken("ramiro", new Date("2026-06-14T12:00:00.000Z"));

    expect(verifySessionToken(token, new Date("2026-07-20T12:00:00.000Z"))).toBeNull();
  });

  it("requireParticipant rejects without a valid session", async () => {
    await expect(
      requireParticipant({
        cookieValue: null,
        prismaClient: createPrismaStub(null) as never,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("requireAdmin rejects without a valid session", async () => {
    await expect(
      requireAdmin({
        cookieValue: null,
        prismaClient: createPrismaStub(null) as never,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("requireAdmin rejects a normal participant", async () => {
    const token = createSessionToken("pedro", new Date("2026-06-14T12:00:00.000Z"));

    await expect(
      requireAdmin({
        cookieValue: token,
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: createPrismaStub({
          id: "pedro",
          name: "Pedro",
          slug: "pedro",
          active: true,
          isAdmin: false,
        }) as never,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("requireAdmin accepts an admin", async () => {
    const token = createSessionToken("ramiro", new Date("2026-06-14T12:00:00.000Z"));
    const participant = {
      id: "ramiro",
      name: "Ramiro",
      slug: "ramiro",
      active: true,
      isAdmin: true,
    };

    await expect(
      requireAdmin({
        cookieValue: token,
        now: new Date("2026-06-14T12:00:01.000Z"),
        prismaClient: createPrismaStub(participant) as never,
      }),
    ).resolves.toEqual(participant);
  });
});

describe("change participant password", () => {
  it("changes the password with the correct current password", async () => {
    const participant = {
      id: "ramiro",
      active: true,
      passwordHash: await hashPassword("vieja", { iterations: 1_000 }),
    };
    const prisma = createMutableParticipantPrisma(participant);

    await expect(
      changeParticipantPassword({
        participantId: "ramiro",
        currentPassword: "vieja",
        newPassword: "nueva",
        confirmPassword: "nueva",
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Contraseña actualizada.",
    });

    await expect(verifyPassword("nueva", participant.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("vieja", participant.passwordHash)).resolves.toBe(false);
  });

  it("rejects an incorrect current password", async () => {
    const participant = {
      id: "ramiro",
      active: true,
      passwordHash: await hashPassword("vieja", { iterations: 1_000 }),
    };

    await expect(
      changeParticipantPassword({
        participantId: "ramiro",
        currentPassword: "incorrecta",
        newPassword: "nueva",
        confirmPassword: "nueva",
        prismaClient: createMutableParticipantPrisma(participant) as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "La contraseña actual no es correcta.",
    });
  });

  it("rejects a different confirmation", async () => {
    const participant = {
      id: "ramiro",
      active: true,
      passwordHash: await hashPassword("vieja", { iterations: 1_000 }),
    };

    await expect(
      changeParticipantPassword({
        participantId: "ramiro",
        currentPassword: "vieja",
        newPassword: "nueva",
        confirmPassword: "otra",
        prismaClient: createMutableParticipantPrisma(participant) as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Las contraseñas nuevas no coinciden.",
    });
  });

  it("allows login with the new password and rejects the old one", async () => {
    const participant = {
      id: "ramiro",
      active: true,
      passwordHash: await hashPassword("vieja", { iterations: 1_000 }),
    };
    const prisma = createMutableParticipantPrisma(participant);

    await changeParticipantPassword({
      participantId: "ramiro",
      currentPassword: "vieja",
      newPassword: "nueva",
      confirmPassword: "nueva",
      prismaClient: prisma as never,
    });

    await expect(
      authenticateParticipant("Ramiro", "nueva", prisma as never),
    ).resolves.toEqual(participant);
    await expect(
      authenticateParticipant("Ramiro", "vieja", prisma as never),
    ).resolves.toBeNull();
  });
});
