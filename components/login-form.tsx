"use client";

import { useActionState } from "react";
import type { LoginFormState } from "@/app/login/actions";

type LoginFormProps = {
  action: (
    state: LoginFormState,
    formData: FormData,
  ) => Promise<LoginFormState>;
};

const initialState: LoginFormState = {
  status: "idle",
  message: null,
};

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-base font-medium text-zinc-800">
        Nombre
        <input
          name="name"
          type="text"
          autoComplete="username"
          required
          placeholder="Ej: Ramiro"
          className="rounded-2xl border border-black/10 px-4 py-3 text-lg text-zinc-950 outline-none focus:border-black"
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-zinc-800">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-2xl border border-black/10 px-4 py-3 text-lg text-zinc-950 outline-none focus:border-black"
        />
      </label>

      {state.message ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-black px-5 py-4 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
