import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalDateTime } from "@/components/local-date-time";
import { getCurrentParticipant } from "@/lib/auth/session";
import { formatMatchDayLabel } from "@/lib/date-format";
import { formatPredictionSummary, formatStageLabel, getMatchStatusLabel } from "@/lib/presentation";
import {
  getMatchDay,
  getParticipantById,
  getParticipantMatches,
  getStandingsStats,
  getStandingsTable,
} from "@/lib/read-models";
import { logoutAction } from "@/app/logout/actions";

export const dynamic = "force-dynamic";

type ParticipantPageProps = {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<{
    view?: "day" | "group" | "standings";
    day?: string;
    group?: string;
  }>;
};

function buildHref(participantId: string, view: string, value?: string) {
  if (view === "day") {
    return value ? `/p/${participantId}?view=day&day=${encodeURIComponent(value)}` : `/p/${participantId}?view=day`;
  }

  if (view === "group") {
    return value ? `/p/${participantId}?view=group&group=${encodeURIComponent(value)}` : `/p/${participantId}?view=group`;
  }

  return `/p/${participantId}?view=standings`;
}

function formatAveragePoints(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStatAverage(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getInitialSelectedDay(days: string[], today: string): string | undefined {
  if (days.includes(today)) {
    return today;
  }

  return days.find((day) => day > today) ?? days.at(-1);
}

export default async function ParticipantPage({
  params,
  searchParams,
}: ParticipantPageProps) {
  const { participantId } = await params;
  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams.view ?? "day";
  const now = new Date();
  const currentParticipant = await getCurrentParticipant();

  if (!currentParticipant) {
    redirect("/login");
  }

  if (currentParticipant.id !== participantId) {
    redirect(`/p/${currentParticipant.id}`);
  }

  const [participant, matches, standings, standingsStats] = await Promise.all([
    getParticipantById(participantId),
    getParticipantMatches(participantId, now),
    getStandingsTable(now),
    getStandingsStats(),
  ]);

  if (!participant || !participant.active) {
    notFound();
  }

  const days = [...new Set(matches.map((match) => getMatchDay(match.kickoffAt)))];
  const today = getMatchDay(now);
  const groups = [...new Set(matches.map((match) => match.groupName).filter((groupName): groupName is string => Boolean(groupName)))];
  const selectedDay =
    resolvedSearchParams.day && days.includes(resolvedSearchParams.day)
      ? resolvedSearchParams.day
      : getInitialSelectedDay(days, today);
  const selectedGroup =
    resolvedSearchParams.group && groups.includes(resolvedSearchParams.group)
      ? resolvedSearchParams.group
      : groups[0];

  const visibleMatches =
    view === "group"
      ? matches.filter((match) => match.groupName === selectedGroup)
      : view === "day"
        ? matches.filter((match) => getMatchDay(match.kickoffAt) === selectedDay)
        : matches;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 rounded-[2rem] bg-[linear-gradient(135deg,#111827,#1f2937)] px-6 py-7 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">Pronósticos Mundial 2026</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{participant.name}</h1>
            <p className="mt-1 text-sm text-white/70">Elegí un partido para cargar o revisar tu pronóstico.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentParticipant.isAdmin ? (
              <Link
                href="/admin/results"
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200"
              >
                Cargar resultados
              </Link>
            ) : null}
            {currentParticipant.isAdmin ? (
              <Link
                href="/admin/participants"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              >
                Usuarios
              </Link>
            ) : null}
            <Link
              href={`/p/${participantId}`}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Mi pantalla
            </Link>
            <Link
              href="/account/password"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Contraseña
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href={buildHref(participantId, "day")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            view === "day" ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          Por día
        </Link>
        <Link
          href={buildHref(participantId, "group")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            view === "group" ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          Por grupo
        </Link>
        <Link
          href={buildHref(participantId, "standings")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            view === "standings" ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          Tabla de puntos
        </Link>
      </nav>

      {view === "day" ? (
        <section className="flex flex-wrap gap-2">
          {days.map((day) => {
            const isSelected = selectedDay === day;
            const isPastDay = day < today;

            return (
              <Link
                key={day}
                href={buildHref(participantId, "day", day)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isSelected
                    ? "bg-amber-300 text-black"
                    : isPastDay
                      ? "bg-zinc-100 text-zinc-400 ring-1 ring-black/5"
                      : "bg-white text-zinc-700 ring-1 ring-black/10 hover:bg-zinc-50"
                }`}
              >
                {formatMatchDayLabel(`${day}T12:00:00`)}
              </Link>
            );
          })}
        </section>
      ) : null}

      {view === "group" ? (
        <section className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Link
              key={group}
              href={buildHref(participantId, "group", group)}
              className={`rounded-full px-4 py-2 text-sm ${
                selectedGroup === group ? "bg-amber-300 text-black" : "bg-white text-zinc-700 ring-1 ring-black/10"
              }`}
            >
              Grupo {group}
            </Link>
          ))}
        </section>
      ) : null}

      {view === "standings" ? (
        <div className="flex flex-col gap-4">
          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-sky-950">Goles del Mundial</h2>
              <p className="mt-1 text-sm text-sky-800">
                Calculado solo con resultados cargados.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-sky-950">
                    {standingsStats.goalStats.totalGoals}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Promedio
                  </p>
                  <p className="mt-1 text-2xl font-bold text-sky-950">
                    {formatStatAverage(standingsStats.goalStats.averageGoalsPerMatch)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Partidos
                  </p>
                  <p className="mt-1 text-2xl font-bold text-sky-950">
                    {standingsStats.goalStats.resultedMatches}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-rose-950">Peor pronóstico</h2>
              <p className="mt-1 text-sm text-rose-900/75">
                Mayor diferencia global entre pronóstico y resultado real.
              </p>
              {standingsStats.worstPredictions.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  {standingsStats.worstPredictions.map((worstPrediction) => (
                    <div
                      key={`${worstPrediction.participantId}-${worstPrediction.matchId}`}
                      className="rounded-2xl border border-rose-200 bg-white/75 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-rose-950">
                            {worstPrediction.participantName}
                          </p>
                          <p className="mt-1 text-sm text-rose-900">
                            Partido {worstPrediction.matchNumber}:{" "}
                            {worstPrediction.homeTeamName} vs {worstPrediction.awayTeamName}
                          </p>
                          <p className="mt-1 text-sm text-rose-900">
                            Pronóstico {formatPredictionSummary(worstPrediction.prediction)} ·
                            resultado {worstPrediction.result?.homeScore} -{" "}
                            {worstPrediction.result?.awayScore}
                          </p>
                        </div>
                        <span className="rounded-full bg-rose-950 px-3 py-1 text-xs font-semibold text-white">
                          {worstPrediction.distance} goles
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-rose-900">
                  Todavía no hay pronósticos con resultado cargado.
                </p>
              )}
            </article>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-zinc-950">
                <thead className="bg-zinc-950 text-left text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Jugador</th>
                    <th className="px-4 py-3 font-semibold">Promedio</th>
                    <th className="px-4 py-3 font-semibold">Puntos</th>
                    <th className="px-4 py-3 font-semibold">Partidos puntuados</th>
                    <th className="px-4 py-3 font-semibold">Resultados exactos</th>
                    <th className="px-4 py-3 font-semibold">Ganador o empate</th>
                    <th className="px-4 py-3 font-semibold">Partidos pronosticados</th>
                    <th className="px-4 py-3 font-semibold">Sin pronóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr
                      key={row.participantId}
                      className={`border-t border-black/10 ${
                        index % 2 === 0 ? "bg-white" : "bg-zinc-50"
                      }`}
                    >
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.participantName}</td>
                      <td className="px-4 py-4 text-lg font-bold text-zinc-950">
                        {formatAveragePoints(row.averagePoints)}
                      </td>
                      <td className="px-4 py-4 text-lg font-bold text-zinc-950">{row.totalPoints}</td>
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.scoredPredictions}</td>
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.exactCount}</td>
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.outcomeCount}</td>
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.predictedMatches}</td>
                      <td className="px-4 py-4 font-semibold text-zinc-950">{row.missedLockedMatches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <section className="grid gap-4">
          {visibleMatches.map((match) => {
            const isPastMatchDay = getMatchDay(match.kickoffAt) < today;

            return (
              <article
                key={match.id}
                className={`rounded-[2rem] border p-5 shadow-sm transition ${
                  isPastMatchDay
                    ? "border-black/5 bg-zinc-50 opacity-75 grayscale-[20%]"
                    : "border-black/10 bg-white"
                }`}
              >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                  <h2 className="text-xl font-semibold text-zinc-950">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </h2>
                  <p className="text-sm text-zinc-600">
                    <LocalDateTime value={match.kickoffAt.toISOString()} />
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {getMatchStatusLabel(match)}
                  </span>
                  <Link
                    href={`/p/${participantId}/matches/${match.id}`}
                    className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-zinc-700">
                <p>
                  <span className="font-medium text-zinc-900">Tu pronóstico:</span>{" "}
                  {formatPredictionSummary(match.currentPrediction)}
                </p>
                {match.city || match.venue ? (
                  <p className="text-zinc-500">
                    {[match.city, match.venue].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
            </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
