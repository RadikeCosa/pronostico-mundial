import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import { hashPassword, verifyPassword } from "./password";

export const MIN_PASSWORD_LENGTH = 4;

export type ChangePasswordResult =
  | { status: "success"; message: "Contraseña actualizada." }
  | { status: "error"; message: string };

type ChangePasswordPrismaClient = {
  participant: {
    findUnique: PrismaClient["participant"]["findUnique"];
    update: PrismaClient["participant"]["update"];
  };
};

export async function changeParticipantPassword(args: {
  participantId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  prismaClient?: ChangePasswordPrismaClient;
}): Promise<ChangePasswordResult> {
  const {
    participantId,
    currentPassword,
    newPassword,
    confirmPassword,
    prismaClient = getPrismaClient(),
  } = args;

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      status: "error",
      message: "Las contraseñas nuevas no coinciden.",
    };
  }

  const participant = await prismaClient.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      passwordHash: true,
      active: true,
    },
  });

  if (!participant?.active) {
    return {
      status: "error",
      message: "Necesitás ingresar de nuevo para cambiar tu contraseña.",
    };
  }

  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    participant.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    return {
      status: "error",
      message: "La contraseña actual no es correcta.",
    };
  }

  const passwordHash = await hashPassword(newPassword);
  await prismaClient.participant.update({
    where: { id: participant.id },
    data: { passwordHash },
  });

  return {
    status: "success",
    message: "Contraseña actualizada.",
  };
}
