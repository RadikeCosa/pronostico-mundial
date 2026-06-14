import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PredictionForm } from "@/components/prediction-form";
import { LocalDateTime } from "@/components/local-date-time";
import { upsertPredictionAction } from "../../actions";
import { getCurrentParticipant } from "@/lib/auth/session";
import { formatPredictionSummary, formatStageLabel, getMatchStatusLabel } from "@/lib/presentation";
import { getMatchReadModelById, getParticipantById } from "@/lib/read-models";

export const dynamic = "force-dynamic";

type MatchDetailPageProps = {
  params: Promise<{ participantId: string; matchId: string }>;
};

function formatGoalAverage(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { participantId, matchId } = await params;
  const now = new Date();
  const currentParticipant = await getCurrentParticipant();

  if (!currentParticipant) {
    redirect("/login");
  }

  if (currentParticipant.id !== participantId) {
    redirect(`/p/${currentParticipant.id}/matches/${matchId}`);
  }

  const [participant, matchReadModel] = await Promise.all([
    getParticipantById(participantId),
    getMatchReadModelById(matchId, participantId, now),
  ]);

  if (!participant || !participant.active || !matchReadModel) {
    notFound();
  }

  const showAdvancingTeamField = matchReadModel.match.stage !== "GROUP";
  const action = upsertPredictionAction.bind(null, participantId, matchId);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/p/${participantId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
              ← Volver a partidos
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>Partido {matchReadModel.match.matchNumber}</span>
              <span>·</span>
              <span>{formatStageLabel(matchReadModel.match.stage)}</span>
              {matchReadModel.match.groupName ? (
                <>
                  <span>·</span>
                  <span>Grupo {matchReadModel.match.groupName}</span>
                </>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
              {matchReadModel.match.homeTeamName} vs {matchReadModel.match.awayTeamName}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              <LocalDateTime value={matchReadModel.match.kickoffAt.toISOString()} />
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            {getMatchStatusLabel({
              isLocked: matchReadModel.isLocked,
              hasResult: matchReadModel.result !== null,
            })}
          </span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">Tu pronóstico</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {formatPredictionSummary(matchReadModel.currentPrediction)}
            </p>
          </section>

          {!matchReadModel.isLocked ? (
            <PredictionForm
              action={action}
              defaultValues={{
                homeScore: matchReadModel.currentPrediction?.homeScore ?? null,
                awayScore: matchReadModel.currentPrediction?.awayScore ?? null,
                advancesTeamName: matchReadModel.currentPrediction?.advancesTeamName ?? null,
              }}
              homeTeamName={matchReadModel.match.homeTeamName}
              awayTeamName={matchReadModel.match.awayTeamName}
              showAdvancingTeamField={showAdvancingTeamField}
            />
          ) : (
            <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              El partido ya empezó. El pronóstico quedó bloqueado y no se puede editar.
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">Resultado</h2>
            {matchReadModel.result ? (
              <p className="mt-2 text-sm text-zinc-700">
                {matchReadModel.result.homeScore} - {matchReadModel.result.awayScore}
                {matchReadModel.result.advancesTeamName
                  ? ` · clasifica ${matchReadModel.result.advancesTeamName}`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">Todavía no hay resultado cargado.</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-sky-950">Goles del Mundial</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Total
                </p>
                <p className="mt-1 text-3xl font-bold text-sky-950">
                  {matchReadModel.tournamentGoalStats.totalGoals}
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Promedio
                </p>
                <p className="mt-1 text-3xl font-bold text-sky-950">
                  {formatGoalAverage(matchReadModel.tournamentGoalStats.averageGoalsPerMatch)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-sky-800">
              Calculado sobre {matchReadModel.tournamentGoalStats.resultedMatches} partidos con
              resultado cargado.
            </p>
          </section>

          {matchReadModel.worstPredictions.length > 0 ? (
            <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-rose-950">Peor pronóstico</h2>
              <p className="mt-1 text-sm text-rose-900/75">
                El más alejado del resultado real.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {matchReadModel.worstPredictions.map((worstPrediction) => (
                  <article
                    key={worstPrediction.participantId}
                    className="rounded-2xl border border-rose-200 bg-white/70 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-rose-950">
                          {worstPrediction.participantName}
                        </h3>
                        <p className="mt-1 text-sm text-rose-900">
                          {formatPredictionSummary(worstPrediction.prediction)}
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-950 px-3 py-1 text-xs font-semibold text-white">
                        {worstPrediction.distance} de diferencia
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">Pronósticos visibles</h2>
            {!matchReadModel.canRevealPredictions ? (
              <p className="mt-2 text-sm text-zinc-600">
                Los pronósticos de los demás participantes se revelan desde el inicio del partido.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {matchReadModel.visiblePredictions.map((visiblePrediction) => (
                  <article
                    key={visiblePrediction.participantId}
                    className="rounded-2xl border border-black/10 bg-zinc-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-zinc-900">
                          {visiblePrediction.participantName}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-700">
                          {visiblePrediction.status === "missing"
                            ? "No pronosticó"
                            : formatPredictionSummary(visiblePrediction.prediction)}
                        </p>
                      </div>
                      {visiblePrediction.score ? (
                        <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                          {visiblePrediction.score.total} puntos
                        </span>
                      ) : null}
                    </div>
                    {visiblePrediction.score ? (
                      <p className="mt-2 text-xs text-zinc-500">{visiblePrediction.score.reason}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
