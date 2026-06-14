import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./prisma";
import {
  normalizeNameForLogin,
  normalizeParticipantName,
  slugifyParticipantName,
} from "./auth/identity";
import { hashPassword } from "./auth/password";

export const MIN_INITIAL_PASSWORD_LENGTH = 4;

export type AdminParticipantCreateResult =
  | { status: "success"; message: "Usuario creado." }
  | { status: "error"; message: string };

type AdminParticipantsPrismaClient = {
  participant: {
    findFirst: PrismaClient["participant"]["findFirst"];
    create: PrismaClient["participant"]["create"];
  };
};

export async function createParticipantWithPassword(args: {
  name: string;
  password: string;
  prismaClient?: AdminParticipantsPrismaClient;
}): Promise<AdminParticipantCreateResult> {
  const prismaClient = args.prismaClient ?? getPrismaClient();
  const name = normalizeParticipantName(args.name);
  const password = args.password.trim();

  if (!name) {
    return {
      status: "error",
      message: "El nombre es obligatorio.",
    };
  }

  if (password.length < MIN_INITIAL_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `La contraseña debe tener al menos ${MIN_INITIAL_PASSWORD_LENGTH} caracteres.`,
    };
  }

  const normalizedName = normalizeNameForLogin(name);
  const existingParticipant = await prismaClient.participant.findFirst({
    where: { normalizedName },
    select: { id: true },
  });

  if (existingParticipant) {
    return {
      status: "error",
      message: "Ya existe un usuario con ese nombre.",
    };
  }

  await prismaClient.participant.create({
    data: {
      name,
      slug: slugifyParticipantName(name),
      normalizedName,
      passwordHash: await hashPassword(password),
      isAdmin: false,
      active: true,
    },
  });

  return {
    status: "success",
    message: "Usuario creado.",
  };
}
