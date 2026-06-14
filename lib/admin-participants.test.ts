import { describe, expect, it } from "vitest";
import { createParticipantWithPassword } from "./admin-participants";
import { verifyPassword } from "./auth/password";

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
