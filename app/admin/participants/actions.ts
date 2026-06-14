"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  createParticipantWithPassword,
  setParticipantActive,
  setParticipantPassword,
} from "@/lib/admin-participants";

export type AdminParticipantCreateFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export type AdminParticipantActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function createAdminParticipantAction(
  _previousState: AdminParticipantCreateFormState,
  formData: FormData,
): Promise<AdminParticipantCreateFormState> {
  await requireAdmin();
  const result = await createParticipantWithPassword({
    name: getStringValue(formData.get("name")),
    password: getStringValue(formData.get("password")),
  });

  if (result.status === "success") {
    revalidatePath("/admin/participants");
  }

  return result;
}

export async function activateParticipantAction(
  participantId: string,
  _previousState: AdminParticipantActionState,
  _formData: FormData,
): Promise<AdminParticipantActionState> {
  void _previousState;
  void _formData;
  await requireAdmin();

  const result = await setParticipantActive({
    participantId,
    active: true,
  });

  if (result.status === "success") {
    revalidatePath("/admin/participants");
  }

  return result;
}

export async function deactivateParticipantAction(
  participantId: string,
  _previousState: AdminParticipantActionState,
  _formData: FormData,
): Promise<AdminParticipantActionState> {
  void _previousState;
  void _formData;
  await requireAdmin();

  const result = await setParticipantActive({
    participantId,
    active: false,
  });

  if (result.status === "success") {
    revalidatePath("/admin/participants");
  }

  return result;
}

export async function changeParticipantPasswordAction(
  participantId: string,
  _previousState: AdminParticipantActionState,
  formData: FormData,
): Promise<AdminParticipantActionState> {
  await requireAdmin();

  const result = await setParticipantPassword({
    participantId,
    password: getStringValue(formData.get("password")),
  });

  if (result.status === "success") {
    revalidatePath("/admin/participants");
  }

  return result;
}
