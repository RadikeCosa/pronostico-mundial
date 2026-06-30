"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type ResultFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type ResultFormProps = {
  action: (
    state: ResultFormState,
    formData: FormData,
  ) => Promise<ResultFormState>;
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

const initialState: ResultFormState = {
  status: "idle",
  message: null,
};

export function ResultForm({
  action,
  defaultValues,
  homeTeamName,
  awayTeamName,
  isKnockout,
}: ResultFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          {homeTeamName}
          <input
            name="homeScore"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={defaultValues.homeScore ?? ""}
            className="rounded-2xl border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          {awayTeamName}
          <input
            name="awayScore"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={defaultValues.awayScore ?? ""}
            className="rounded-2xl border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
          />
        </label>
      </div>

      {isKnockout ? (
        <>
          <p className="text-xs text-zinc-700">
            Cargá el marcador a los 90 minutos y luego indicá clasificado y
            método de resolución.
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Equipo que clasifica
            <select
              name="advancesTeamName"
              required
              defaultValue={defaultValues.advancesTeamName ?? ""}
              className="rounded-2xl border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
            >
              <option value="">Seleccionar equipo</option>
              <option value={homeTeamName}>{homeTeamName}</option>
              <option value={awayTeamName}>{awayTeamName}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Método de resolución
            <select
              name="resolutionMethod"
              required
              defaultValue={defaultValues.resolutionMethod ?? ""}
              className="rounded-2xl border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
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
          className={`text-xs ${
            state.status === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Guardando..." : "Guardar resultado"}
      </button>
    </form>
  );
}
