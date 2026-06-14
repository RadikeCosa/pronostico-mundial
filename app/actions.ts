"use server";

import { revalidatePath } from "next/cache";
import { getPrismaClient } from "@/lib/prisma";
import type { ParticipantCreateState } from "@/components/participant-create-form";

function normalizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

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
  const existingParticipant = await prisma.participant.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
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
      active: true,
    },
  });

  revalidatePath("/");

  return {
    status: "success",
    message: "Participante creado.",
  };
}
