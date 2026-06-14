import { formatMatchDayLabel, LocalDateTime } from "@/components/local-date-time";
import { ResultForm } from "@/components/result-form";
import { requireAdmin } from "@/lib/auth/session";
import { formatResultTrace, formatStageLabel } from "@/lib/presentation";
import { getAdminResultsGroupedByDay } from "@/lib/read-models";
import { upsertMatchResultAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  const groupedMatches = await getAdminResultsGroupedByDay();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] bg-[linear-gradient(135deg,#111827,#1f2937)] px-6 py-7 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">Admin simple</p>
        <h1 className="mt-2 text-3xl font-semibold">Carga manual de resultados</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Solo administradores pueden cargar resultados. Los resultados impactan directo en la tabla de puntos.
        </p>
      </header>

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
