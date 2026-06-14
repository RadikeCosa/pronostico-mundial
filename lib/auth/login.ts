import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import { normalizeNameForLogin, slugifyParticipantName } from "./identity";
import { verifyPassword } from "./password";

export type LoginParticipant = {
  id: string;
  active: boolean;
  passwordHash: string | null;
};

type LoginPrismaClient = {
  participant: {
    findFirst: PrismaClient["participant"]["findFirst"];
  };
};

export async function authenticateParticipant(
  rawName: string,
  password: string,
  prismaClient: LoginPrismaClient = getPrismaClient(),
): Promise<LoginParticipant | null> {
  const normalizedName = normalizeNameForLogin(rawName);
  const slug = slugifyParticipantName(rawName);
  const participant = await prismaClient.participant.findFirst({
    where: {
      OR: [{ normalizedName }, { slug }],
    },
    select: {
      id: true,
      active: true,
      passwordHash: true,
    },
  });

  if (!participant?.active) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, participant.passwordHash);
  return isValidPassword ? participant : null;
}
