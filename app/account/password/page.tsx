import Link from "next/link";
import { PasswordChangeForm } from "@/components/password-change-form";
import { requireParticipant } from "@/lib/auth/session";
import { changePasswordAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const participant = await requireParticipant();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/10">
        <Link
          href={`/p/${participant.id}`}
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
        >
          ← Volver
        </Link>
        <p className="mt-6 text-sm uppercase tracking-[0.18em] text-zinc-500">
          Cuenta
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-950">
          Cambiar contraseña
        </h1>
        <p className="mt-2 text-base leading-7 text-zinc-600">
          Hola, {participant.name}. Elegí una contraseña que te resulte fácil de recordar.
        </p>

        <PasswordChangeForm action={changePasswordAction} />
      </section>
    </main>
  );
}
