import { describe, expect, it } from "vitest";
import {
  createParticipantWithPassword,
  setParticipantActive,
  setParticipantPassword,
} from "./admin-participants";
import { authenticateParticipant } from "./auth/login";
import { hashPassword, verifyPassword } from "./auth/password";

function createPrismaStub(existingParticipant: unknown = null) {
  const calls = {
    createData: null as {
      name: string;
      slug: string;
      normalizedName: string;
      passwordHash: string;
      isAdmin: boolean;
      active: boolean;
    } | null,
  };

  return {
    calls,
    prisma: {
      participant: {
        findFirst: async () => existingParticipant,
        create: async ({ data }: { data: NonNullable<typeof calls.createData> }) => {
          calls.createData = data;
          return data;
        },
      },
    },
  };
}

function createMutableAdminParticipantsPrisma(participants: Array<{
  id: string;
  name: string;
  slug: string;
  normalizedName: string;
  active: boolean;
  isAdmin: boolean;
  passwordHash: string | null;
}>) {
  return {
    participant: {
      findFirst: async ({ where }: { where?: { OR?: Array<{ normalizedName?: string; slug?: string }>; normalizedName?: string; slug?: string } }) => {
        if (where?.OR) {
          return (
            participants.find((participant) =>
              where.OR?.some(
                (condition) =>
                  (condition.normalizedName !== undefined && participant.normalizedName === condition.normalizedName) ||
                  (condition.slug !== undefined && participant.slug === condition.slug),
              ),
            ) ?? null
          );
        }

        if (where?.normalizedName) {
          return participants.find((participant) => participant.normalizedName === where.normalizedName) ?? null;
        }

        if (where?.slug) {
          return participants.find((participant) => participant.slug === where.slug) ?? null;
        }

        return null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        return participants.find((participant) => participant.id === where.id) ?? null;
      },
      count: async ({ where }: { where: { active?: boolean; isAdmin?: boolean; NOT?: { id?: string } } }) => {
        return participants.filter((participant) => {
          if (where.active !== undefined && participant.active !== where.active) {
            return false;
          }

          if (where.isAdmin !== undefined && participant.isAdmin !== where.isAdmin) {
            return false;
          }

          if (where.NOT?.id && participant.id === where.NOT.id) {
            return false;
          }

          return true;
        }).length;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { active?: boolean; passwordHash?: string };
      }) => {
        const participant = participants.find((item) => item.id === where.id);

        if (!participant) {
          throw new Error("Participant not found");
        }

        if (data.active !== undefined) {
          participant.active = data.active;
        }

        if (data.passwordHash !== undefined) {
          participant.passwordHash = data.passwordHash;
        }

        return participant;
      },
      create: async () => {
        throw new Error("not used");
      },
    },
  };
}

describe("createParticipantWithPassword", () => {
  it("creates an active normal participant with a hashed password", async () => {
    const { prisma, calls } = createPrismaStub();

    await expect(
      createParticipantWithPassword({
        name: "  Ana   María ",
        password: "abcd",
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Usuario creado.",
    });

    expect(calls.createData).toMatchObject({
      name: "Ana María",
      slug: "ana-maria",
      normalizedName: "ana maría",
      isAdmin: false,
      active: true,
    });
    expect(calls.createData?.passwordHash).not.toBe("abcd");
    await expect(verifyPassword("abcd", calls.createData?.passwordHash)).resolves.toBe(true);
  });

  it("rejects a duplicate participant name", async () => {
    const { prisma, calls } = createPrismaStub({ id: "existing" });

    await expect(
      createParticipantWithPassword({
        name: "Ana",
        password: "abcd",
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Ya existe un usuario con ese nombre.",
    });
    expect(calls.createData).toBeNull();
  });

  it("rejects a short password", async () => {
    const { prisma, calls } = createPrismaStub();

    await expect(
      createParticipantWithPassword({
        name: "Ana",
        password: "abc",
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "La contraseña debe tener al menos 4 caracteres.",
    });
    expect(calls.createData).toBeNull();
  });
});

describe("admin participant management", () => {
  it("deactivates a normal participant", async () => {
    const participants = [
      {
        id: "ramiro",
        name: "Ramiro",
        slug: "ramiro",
        normalizedName: "ramiro",
        active: true,
        isAdmin: true,
        passwordHash: await hashPassword("ramiro-pass", { iterations: 1_000 }),
      },
      {
        id: "pedro",
        name: "Pedro",
        slug: "pedro",
        normalizedName: "pedro",
        active: true,
        isAdmin: false,
        passwordHash: null,
      },
    ];
    const prisma = createMutableAdminParticipantsPrisma(participants);

    await expect(
      setParticipantActive({
        participantId: "pedro",
        active: false,
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Usuario desactivado.",
    });

    expect(participants[1].active).toBe(false);
  });

  it("activates an inactive participant", async () => {
    const participants = [
      {
        id: "pedro",
        name: "Pedro",
        slug: "pedro",
        normalizedName: "pedro",
        active: false,
        isAdmin: false,
        passwordHash: null,
      },
    ];
    const prisma = createMutableAdminParticipantsPrisma(participants);

    await expect(
      setParticipantActive({
        participantId: "pedro",
        active: true,
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Usuario activado.",
    });

    expect(participants[0].active).toBe(true);
  });

  it("rejects deactivating the last admin", async () => {
    const participants = [
      {
        id: "ramiro",
        name: "Ramiro",
        slug: "ramiro",
        normalizedName: "ramiro",
        active: true,
        isAdmin: true,
        passwordHash: null,
      },
    ];
    const prisma = createMutableAdminParticipantsPrisma(participants);

    await expect(
      setParticipantActive({
        participantId: "ramiro",
        active: false,
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "No podés desactivar el último administrador.",
    });

    expect(participants[0].active).toBe(true);
  });

  it("changes another participant password and preserves login behavior", async () => {
    const participants = [
      {
        id: "pedro",
        name: "Pedro",
        slug: "pedro",
        normalizedName: "pedro",
        active: true,
        isAdmin: false,
        passwordHash: await hashPassword("vieja", { iterations: 1_000 }),
      },
    ];
    const prisma = createMutableAdminParticipantsPrisma(participants);

    await expect(
      setParticipantPassword({
        participantId: "pedro",
        password: "nueva",
        prismaClient: prisma as never,
      }),
    ).resolves.toEqual({
      status: "success",
      message: "Contraseña actualizada.",
    });

    await expect(verifyPassword("nueva", participants[0].passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("vieja", participants[0].passwordHash)).resolves.toBe(false);

    await expect(
      authenticateParticipant("Pedro", "nueva", prisma as never),
    ).resolves.toMatchObject({ id: "pedro", active: true });
    await expect(
      authenticateParticipant("Pedro", "vieja", prisma as never),
    ).resolves.toBeNull();
  });
});
