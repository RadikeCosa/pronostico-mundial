import Link from "next/link";
import { AdminParticipantCreateForm } from "@/components/admin-participant-create-form";
import { requireAdmin } from "@/lib/auth/session";
import { getPrismaClient } from "@/lib/prisma";
import { createAdminParticipantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  await requireAdmin();
  const participants = await getPrismaClient().participant.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      active: true,
      isAdmin: true,
      passwordHash: true,
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] bg-[linear-gradient(135deg,#111827,#1f2937)] px-6 py-7 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">Admin simple</p>
        <h1 className="mt-2 text-3xl font-semibold">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Agregá participantes con una contraseña inicial para que puedan entrar.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/results"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Cargar resultados
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Volver
          </Link>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-zinc-950">
              <thead className="bg-zinc-950 text-left text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, index) => (
                  <tr
                    key={participant.id}
                    className={`border-t border-black/10 ${
                      index % 2 === 0 ? "bg-white" : "bg-zinc-50"
                    }`}
                  >
                    <td className="px-4 py-4 font-semibold">{participant.name}</td>
                    <td className="px-4 py-4">
                      {participant.isAdmin ? "Admin" : "Participante"}
                    </td>
                    <td className="px-4 py-4">
                      {participant.active ? "Activo" : "Inactivo"}
                    </td>
                    <td className="px-4 py-4">
                      {participant.passwordHash ? "Configurada" : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <AdminParticipantCreateForm action={createAdminParticipantAction} />
      </section>
    </main>
  );
}
