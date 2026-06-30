"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type PredictionFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type PredictionFormProps = {
  action: (
    state: PredictionFormState,
    formData: FormData,
  ) => Promise<PredictionFormState>;
  defaultValues: {
    homeScore: number | null;
    awayScore: number | null;
    advancesTeamName: string | null;
    resolutionMethod: "REGULAR" | "EXTRA_TIME" | "PENALTIES" | null;
  };
  homeTeamName: string;
  awayTeamName: string;
  isKnockout: boolean;
};

const initialState: PredictionFormState = {
  status: "idle",
  message: null,
};

export function PredictionForm({
  action,
  defaultValues,
  homeTeamName,
  awayTeamName,
  isKnockout,
}: PredictionFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          {homeTeamName}
          <input
            name="homeScore"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            defaultValue={defaultValues.homeScore ?? ""}
            className="rounded-2xl border border-black/10 px-3 py-2 text-base text-zinc-900 outline-none focus:border-black"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          {awayTeamName}
          <input
            name="awayScore"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            defaultValue={defaultValues.awayScore ?? ""}
            className="rounded-2xl border border-black/10 px-3 py-2 text-base text-zinc-900 outline-none focus:border-black"
          />
        </label>
      </div>

      {isKnockout ? (
        <>
          <p className="text-sm text-zinc-700">
            En eliminación directa, cargá el marcador a los 90 minutos
            reglamentarios.
          </p>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            ¿Quién clasifica?
            <select
              name="advancesTeamName"
              required
              defaultValue={defaultValues.advancesTeamName ?? ""}
              className="rounded-2xl border border-black/10 px-3 py-2 text-base text-zinc-900 outline-none focus:border-black"
            >
              <option value="">Seleccionar equipo</option>
              <option value={homeTeamName}>{homeTeamName}</option>
              <option value={awayTeamName}>{awayTeamName}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Método de resolución
            <select
              name="resolutionMethod"
              required
              defaultValue={defaultValues.resolutionMethod ?? ""}
              className="rounded-2xl border border-black/10 px-3 py-2 text-base text-zinc-900 outline-none focus:border-black"
            >
              <option value="">Seleccionar método</option>
              <option value="REGULAR">En 90 minutos</option>
              <option value="EXTRA_TIME">En alargue</option>
              <option value="PENALTIES">Por penales</option>
            </select>
          </label>
        </>
      ) : null}

      {state.message ? (
        <p
          className={`text-sm ${
            state.status === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Guardando..." : "Guardar pronóstico"}
      </button>
    </form>
  );
}
