"use server";

import { redirect } from "next/navigation";
import { getPrismaClient } from "@/lib/prisma";
import { authenticateParticipant } from "@/lib/auth/login";
import { setSessionCookie } from "@/lib/auth/session";

export type LoginFormState = {
  status: "idle" | "error";
  message: string | null;
};

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawName = getStringValue(formData.get("name"));
  const password = getStringValue(formData.get("password"));
  const errorState: LoginFormState = {
    status: "error",
    message: "Nombre o contraseña incorrectos.",
  };

  if (!rawName || !password) {
    return errorState;
  }

  const prisma = getPrismaClient();
  const participant = await authenticateParticipant(rawName, password, prisma);
  if (!participant) {
    return errorState;
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: { lastLoginAt: new Date() },
  });
  await setSessionCookie(participant.id);

  redirect(`/p/${participant.id}`);
}
