"use client";

import { useActionState } from "react";
import type { PasswordChangeFormState } from "@/app/account/password/actions";

type PasswordChangeFormProps = {
  action: (
    state: PasswordChangeFormState,
    formData: FormData,
  ) => Promise<PasswordChangeFormState>;
};

const initialState: PasswordChangeFormState = {
  status: "idle",
  message: null,
};

export function PasswordChangeForm({ action }: PasswordChangeFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-base font-medium text-zinc-800">
        Contraseña actual
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-2xl border border-black/10 px-4 py-3 text-lg text-zinc-950 outline-none focus:border-black"
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-zinc-800">
        Nueva contraseña
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={4}
          className="rounded-2xl border border-black/10 px-4 py-3 text-lg text-zinc-950 outline-none focus:border-black"
        />
      </label>

      <label className="flex flex-col gap-2 text-base font-medium text-zinc-800">
        Repetir nueva contraseña
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={4}
          className="rounded-2xl border border-black/10 px-4 py-3 text-lg text-zinc-950 outline-none focus:border-black"
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
        className="rounded-full bg-black px-5 py-4 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isPending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
