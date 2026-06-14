import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentParticipant } from "@/lib/auth/session";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const participant = await getCurrentParticipant();

  if (participant) {
    redirect(`/p/${participant.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/10">
        <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
          Pronósticos Mundial 2026
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Ingresar</h1>
        <p className="mt-2 text-base leading-7 text-zinc-600">
          Escribí tu nombre y contraseña para cargar tus pronósticos.
        </p>

        <LoginForm action={loginAction} />
      </section>
    </main>
  );
}
