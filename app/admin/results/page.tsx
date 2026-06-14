import { LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { requireAdmin } from "@/lib/auth/session";
import { formatMatchDayLabel } from "@/lib/date-format";
import { formatResultTrace, formatStageLabel } from "@/lib/presentation";
import { getAdminResultsGroupedByDay, getTournamentGoalStats } from "@/lib/read-models";
import { upsertMatchResultAction } from "./actions";

export const dynamic = "force-dynamic";

function formatGoalAverage(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function AdminResultsPage() {
  await requireAdmin();
  const [groupedMatches, goalStats] = await Promise.all([
    getAdminResultsGroupedByDay(),
    getTournamentGoalStats(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] bg-[linear-gradient(135deg,#111827,#1f2937)] px-6 py-7 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">
          Administración simple
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Carga manual de resultados</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Solo administradores pueden cargar resultados. Los resultados impactan directo en la tabla de puntos.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/participants"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Usuarios
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Volver
          </Link>
        </div>
      </header>

      <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-sky-950">Goles del Mundial</h2>
          <p className="text-sm text-sky-800">
            Estadísticas calculadas solo con resultados cargados.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Total
            </p>
            <p className="mt-1 text-3xl font-bold text-sky-950">{goalStats.totalGoals}</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Promedio
            </p>
            <p className="mt-1 text-3xl font-bold text-sky-950">
              {formatGoalAverage(goalStats.averageGoalsPerMatch)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Partidos con resultado
            </p>
            <p className="mt-1 text-3xl font-bold text-sky-950">
              {goalStats.resultedMatches}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-8">
        {groupedMatches.map((group) => (
          <section key={group.day} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-950">
                {formatMatchDayLabel(`${group.day}T12:00:00`)}
              </h2>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <div className="grid gap-4">
              {group.matches.map((match) => {
                const action = upsertMatchResultAction.bind(null, match.id);
                const showAdvancingTeamField = match.stage !== "GROUP";
                const resultTrace = formatResultTrace(match.result);

                return (
                  <article
                    key={match.id}
                    className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm"
                  >
                    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                          <span>Partido {match.matchNumber}</span>
                          <span>·</span>
                          <span>{formatStageLabel(match.stage)}</span>
                          {match.groupName ? (
                            <>
                              <span>·</span>
                              <span>Grupo {match.groupName}</span>
                            </>
                          ) : null}
                        </div>

                        <h3 className="text-xl font-semibold text-zinc-950">
                          {match.homeTeamName} vs {match.awayTeamName}
                        </h3>

                        <p className="text-sm text-zinc-600">
                          <LocalDateTime value={match.kickoffAt.toISOString()} />
                        </p>

                        <p className="text-sm text-zinc-700">
                          <span className="font-medium text-zinc-950">Resultado actual:</span>{" "}
                          {match.result
                            ? `${match.result.homeScore} - ${match.result.awayScore}${
                                match.result.advancesTeamName
                                  ? ` · clasifica ${match.result.advancesTeamName}`
                                  : ""
                              }`
                            : "Sin cargar"}
                        </p>
                        {resultTrace ? (
                          <p className="text-xs text-zinc-500">{resultTrace}</p>
                        ) : null}
                      </div>

                      {match.isLocked ? (
                        <ResultForm
                          action={action}
                          defaultValues={{
                            homeScore: match.result?.homeScore ?? null,
                            awayScore: match.result?.awayScore ?? null,
                            advancesTeamName: match.result?.advancesTeamName ?? null,
                          }}
                          homeTeamName={match.homeTeamName}
                          awayTeamName={match.awayTeamName}
                          showAdvancingTeamField={showAdvancingTeamField}
                        />
                      ) : (
                        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                          Disponible desde el inicio del partido.
                        </section>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
