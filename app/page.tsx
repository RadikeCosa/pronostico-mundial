import Link from "next/link";
import { ParticipantCreateForm } from "@/components/participant-create-form";
import { listActiveParticipants } from "@/lib/read-models";
import { createParticipantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const participants = await listActiveParticipants();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6">
      <section className="rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,#fbbf24,transparent_35%),linear-gradient(135deg,#0f172a,#111827)] px-6 py-10 text-white shadow-xl sm:px-10">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-200">App familiar</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Pronósticos Mundial 2026
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
          Elegí tu participante para cargar pronósticos, revisar partidos y seguir la tabla de puntos.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((participant) => (
            <Link
              key={participant.id}
              href={`/p/${participant.id}`}
              className="group rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <p className="text-sm uppercase tracking-wide text-zinc-500">Ingresar como</p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-950">{participant.name}</h2>
              <p className="mt-5 text-sm font-medium text-zinc-600 group-hover:text-zinc-950">
                Ver partidos y cargar pronósticos →
              </p>
            </Link>
          ))}
        </div>

        <ParticipantCreateForm action={createParticipantAction} />
      </section>
    </main>
  );
}
