"use server";

import { changeParticipantPassword } from "@/lib/auth/change-password";
import { requireParticipant } from "@/lib/auth/session";

export type PasswordChangeFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function getStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function changePasswordAction(
  _previousState: PasswordChangeFormState,
  formData: FormData,
): Promise<PasswordChangeFormState> {
  const participant = await requireParticipant();
  const currentPassword = getStringValue(formData.get("currentPassword"));
  const newPassword = getStringValue(formData.get("newPassword"));
  const confirmPassword = getStringValue(formData.get("confirmPassword"));

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      status: "error",
      message: "Completá todos los campos.",
    };
  }

  return changeParticipantPassword({
    participantId: participant.id,
    currentPassword,
    newPassword,
    confirmPassword,
  });
}
