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
    findUnique: PrismaClient["participant"]["findUnique"];
    count: PrismaClient["participant"]["count"];
    update: PrismaClient["participant"]["update"];
    create: PrismaClient["participant"]["create"];
  };
};

export type AdminParticipantStatusResult =
  | { status: "success"; message: "Usuario activado." | "Usuario desactivado." }
  | { status: "error"; message: string };

export type AdminParticipantPasswordResult =
  | { status: "success"; message: "Contraseña actualizada." }
  | { status: "error"; message: string };

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

export async function setParticipantActive(args: {
  participantId: string;
  active: boolean;
  prismaClient?: AdminParticipantsPrismaClient;
}): Promise<AdminParticipantStatusResult> {
  const prismaClient = args.prismaClient ?? getPrismaClient();
  const participant = await prismaClient.participant.findUnique({
    where: { id: args.participantId },
    select: {
      id: true,
      active: true,
      isAdmin: true,
    },
  });

  if (!participant) {
    return {
      status: "error",
      message: "Usuario no encontrado.",
    };
  }

  if (!args.active && participant.isAdmin) {
    const activeAdminCount = await prismaClient.participant.count({
      where: {
        active: true,
        isAdmin: true,
        NOT: { id: participant.id },
      },
    });

    if (activeAdminCount === 0) {
      return {
        status: "error",
        message: "No podés desactivar el último administrador.",
      };
    }
  }

  if (participant.active !== args.active) {
    await prismaClient.participant.update({
      where: { id: participant.id },
      data: { active: args.active },
    });
  }

  return {
    status: "success",
    message: args.active ? "Usuario activado." : "Usuario desactivado.",
  };
}

export async function setParticipantPassword(args: {
  participantId: string;
  password: string;
  prismaClient?: AdminParticipantsPrismaClient;
}): Promise<AdminParticipantPasswordResult> {
  const prismaClient = args.prismaClient ?? getPrismaClient();
  const password = args.password.trim();

  if (password.length < MIN_INITIAL_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `La contraseña debe tener al menos ${MIN_INITIAL_PASSWORD_LENGTH} caracteres.`,
    };
  }

  const participant = await prismaClient.participant.findUnique({
    where: { id: args.participantId },
    select: {
      id: true,
    },
  });

  if (!participant) {
    return {
      status: "error",
      message: "Usuario no encontrado.",
    };
  }

  await prismaClient.participant.update({
    where: { id: participant.id },
    data: {
      passwordHash: await hashPassword(password),
    },
  });

  return {
    status: "success",
    message: "Contraseña actualizada.",
  };
}
