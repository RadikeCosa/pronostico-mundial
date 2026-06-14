"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type ParticipantCreateState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

type ParticipantCreateFormProps = {
  action: (
    state: ParticipantCreateState,
    formData: FormData,
  ) => Promise<ParticipantCreateState>;
};

const initialState: ParticipantCreateState = {
  status: "idle",
  message: null,
};

export function ParticipantCreateForm({
  action,
}: ParticipantCreateFormProps) {
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
      className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            Agregar participante
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Nuevo participante activo por defecto, sin login ni contraseña.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Nombre
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Ej. Juan"
            className="rounded-2xl border border-black/10 px-3 py-2 text-base text-zinc-900 outline-none focus:border-black"
          />
        </label>

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
          {isPending ? "Creando..." : "Crear participante"}
        </button>
      </div>
    </form>
  );
}
