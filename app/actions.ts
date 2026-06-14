"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/prisma";
import {
  normalizeNameForLogin,
  normalizeParticipantName,
  slugifyParticipantName,
} from "@/lib/auth/identity";
import type { ParticipantCreateState } from "@/components/participant-create-form";

export async function createParticipantAction(
  _previousState: ParticipantCreateState,
  formData: FormData,
): Promise<ParticipantCreateState> {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? normalizeParticipantName(rawName) : "";

  if (!name) {
    return {
      status: "error",
      message: "El nombre es obligatorio.",
    };
  }

  const prisma = getPrismaClient();
  const normalizedName = normalizeNameForLogin(name);
  const existingParticipant = await prisma.participant.findFirst({
    where: {
      normalizedName,
    },
    select: {
      id: true,
    },
  });

  if (existingParticipant) {
    return {
      status: "error",
      message: "Ya existe un participante con ese nombre.",
    };
  }

  await prisma.participant.create({
    data: {
      name,
      slug: slugifyParticipantName(name),
      normalizedName,
      active: true,
    },
  });

  revalidatePath("/");

  return {
    status: "success",
    message: "Participante creado.",
  };
}
