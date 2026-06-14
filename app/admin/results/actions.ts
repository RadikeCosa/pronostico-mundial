"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { upsertAdminMatchResult } from "@/lib/admin-results";
import type { ResultFormState } from "@/components/result-form";

export async function upsertMatchResultAction(
  matchId: string,
  _previousState: ResultFormState,
  formData: FormData,
): Promise<ResultFormState> {
  const admin = await requireAdmin();
  const result = await upsertAdminMatchResult({
    adminParticipantId: admin.id,
    matchId,
    homeScoreRaw: formData.get("homeScore"),
    awayScoreRaw: formData.get("awayScore"),
    advancesTeamNameRaw: formData.get("advancesTeamName"),
  });

  if (result.status === "success") {
    revalidatePath("/admin/results");
    revalidatePath("/", "layout");
  }

  return result;
}
