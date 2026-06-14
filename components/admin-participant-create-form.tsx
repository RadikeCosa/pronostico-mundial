"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AdminParticipantCreateFormState } from "@/app/admin/participants/actions";

type AdminParticipantCreateFormProps = {
  action: (
    state: AdminParticipantCreateFormState,
    formData: FormData,
  ) => Promise<AdminParticipantCreateFormState>;
};

const initialState: AdminParticipantCreateFormState = {
  status: "idle",
  message: null,
};

export function AdminParticipantCreateForm({
  action,
}: AdminParticipantCreateFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Crear usuario</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Cargá el nombre y una contraseña inicial. Después la persona puede cambiarla.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Nombre
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Ej. Ana"
            className="rounded-2xl border border-black/10 px-4 py-3 text-base text-zinc-950 outline-none focus:border-black"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Contraseña inicial
          <input
            name="password"
            type="password"
            required
            minLength={4}
            className="rounded-2xl border border-black/10 px-4 py-3 text-base text-zinc-950 outline-none focus:border-black"
          />
        </label>

        {state.message ? (
          <p
            className={`rounded-2xl px-4 py-3 text-sm ${
              state.status === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
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
          {isPending ? "Creando..." : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
