"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AdminParticipantActionState } from "@/app/admin/participants/actions";

type ParticipantActionHandler = (
  state: AdminParticipantActionState,
  formData: FormData,
) => Promise<AdminParticipantActionState>;

type AdminParticipantRowActionsProps = {
  isActive: boolean;
  statusAction: ParticipantActionHandler;
  passwordAction: ParticipantActionHandler;
};

const initialState: AdminParticipantActionState = {
  status: "idle",
  message: null,
};

export function AdminParticipantRowActions({
  isActive,
  statusAction,
  passwordAction,
}: AdminParticipantRowActionsProps) {
  const router = useRouter();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [statusState, statusFormAction, statusPending] = useActionState(
    statusAction,
    initialState,
  );
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    passwordAction,
    initialState,
  );

  useEffect(() => {
    if (statusState.status === "success") {
      router.refresh();
    }
  }, [router, statusState.status]);

  useEffect(() => {
    if (passwordState.status === "success") {
      passwordFormRef.current?.reset();
      router.refresh();
    }
  }, [router, passwordState.status]);

  return (
    <div className="flex flex-col gap-4">
      <form action={statusFormAction} className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={statusPending}
          className={`min-h-11 rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
            isActive
              ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-300"
          }`}
        >
          {statusPending ? "Guardando..." : isActive ? "Desactivar" : "Activar"}
        </button>
        <p className="text-xs text-zinc-500">
          {isActive
            ? "No borra los datos del usuario."
            : "Vuelve a habilitar el acceso."}
        </p>
        {statusState.message ? (
          <p
            className={`text-xs ${
              statusState.status === "error"
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            {statusState.message}
          </p>
        ) : null}
      </form>

      <form
        ref={passwordFormRef}
        action={passwordFormAction}
        className="flex flex-col gap-2"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Nueva contraseña
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={4}
            className="rounded-2xl border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
          />
        </label>
        <button
          type="submit"
          disabled={passwordPending}
          className="min-h-11 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {passwordPending ? "Guardando..." : "Cambiar contraseña"}
        </button>
        <p className="text-xs text-zinc-500">
          Se guarda como hash. El usuario la puede cambiar después.
        </p>
        {passwordState.message ? (
          <p
            className={`text-xs ${
              passwordState.status === "error"
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            {passwordState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
