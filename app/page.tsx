import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const participant = await getCurrentParticipant();

  if (participant) {
    redirect(`/p/${participant.id}`);
  }

  redirect("/login");
}
