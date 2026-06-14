"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createParticipantWithPassword } from "@/lib/admin-participants";

export type AdminParticipantCreateFormState = {
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
