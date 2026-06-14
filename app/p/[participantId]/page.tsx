import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/local-date-time";
import { formatPredictionSummary, formatStageLabel, getMatchStatusLabel } from "@/lib/presentation";
import {
  getMatchDay,
  getParticipantById,
  getParticipantMatches,
  getStandingsTable,
} from "@/lib/read-models";

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

export default async function ParticipantPage({
  params,
  searchParams,
}: ParticipantPageProps) {
  const { participantId } = await params;
  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams.view ?? "day";
  const now = new Date();

  const [participant, matches, standings] = await Promise.all([
    getParticipantById(participantId),
    getParticipantMatches(participantId, now),
    getStandingsTable(now),
  ]);

  if (!participant || !participant.active) {
    notFound();
  }

  const days = [...new Set(matches.map((match) => getMatchDay(match.kickoffAt)))];
  const groups = [...new Set(matches.map((match) => match.groupName).filter((groupName): groupName is string => Boolean(groupName)))];
  const selectedDay =
    resolvedSearchParams.day && days.includes(resolvedSearchParams.day)
      ? resolvedSearchParams.day
      : days[0];
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{participant.name}</h1>
            <p className="mt-1 text-sm text-white/70">Elegí un partido para cargar o revisar tu pronóstico.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Cambiar participante
          </Link>
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
          {days.map((day) => (
            <Link
              key={day}
              href={buildHref(participantId, "day", day)}
              className={`rounded-full px-4 py-2 text-sm ${
                selectedDay === day ? "bg-amber-300 text-black" : "bg-white text-zinc-700 ring-1 ring-black/10"
              }`}
            >
              {day}
            </Link>
          ))}
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
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Participante</th>
                  <th className="px-4 py-3 font-medium">Puntos</th>
                  <th className="px-4 py-3 font-medium">Exactos</th>
                  <th className="px-4 py-3 font-medium">Signos</th>
                  <th className="px-4 py-3 font-medium">Pronosticados</th>
                  <th className="px-4 py-3 font-medium">Sin pronóstico bloqueados</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.participantId} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.participantName}</td>
                    <td className="px-4 py-3">{row.totalPoints}</td>
                    <td className="px-4 py-3">{row.exactCount}</td>
                    <td className="px-4 py-3">{row.outcomeCount}</td>
                    <td className="px-4 py-3">{row.predictedMatches}</td>
                    <td className="px-4 py-3">{row.missedLockedMatches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {visibleMatches.map((match) => (
            <article
              key={match.id}
              className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm"
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
          ))}
        </section>
      )}
    </main>
  );
}
