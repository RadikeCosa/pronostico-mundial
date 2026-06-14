"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const [openMenu, setOpenMenu] = useState<
    "menu" | "status" | "password" | null
  >(null);
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
    <div className="relative inline-block">
      <button
        onClick={() => setOpenMenu(openMenu ? null : "menu")}
        className="inline-flex items-center justify-center rounded-full px-3 py-2 text-zinc-600 transition hover:bg-zinc-100"
        title="Acciones"
      >
        <span className="text-lg font-bold">⋮</span>
      </button>

      {openMenu === "menu" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="flex flex-col">
            <button
              onClick={() => setOpenMenu("status")}
              className="px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 first:rounded-t-xl"
            >
              {isActive ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => setOpenMenu("password")}
              className="px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 last:rounded-b-xl"
            >
              Cambiar contraseña
            </button>
          </div>
        </div>
      )}

      {openMenu === "status" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-black/10 bg-white shadow-lg">
          <form action={statusFormAction} className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium text-zinc-900">
              {isActive ? "Desactivar usuario" : "Activar usuario"}
            </p>
            <button
              type="submit"
              disabled={statusPending}
              className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                isActive
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-400"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-300"
              }`}
            >
              {statusPending
                ? "Guardando..."
                : isActive
                  ? "Desactivar"
                  : "Activar"}
            </button>
            <p className="text-xs text-zinc-500">
              {isActive
                ? "No borra los datos del usuario."
                : "Vuelve a habilitar el acceso."}
            </p>
            {statusState.message ? (
              <p
                className={`text-xs font-medium ${
                  statusState.status === "error"
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {statusState.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOpenMenu(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {openMenu === "password" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-black/10 bg-white shadow-lg">
          <form
            ref={passwordFormRef}
            action={passwordFormAction}
            className="flex flex-col gap-3 p-4"
          >
            <p className="text-sm font-medium text-zinc-900">
              Cambiar contraseña
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-600">
                Nueva contraseña
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={4}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-black"
              />
            </label>
            <button
              type="submit"
              disabled={passwordPending}
              className="min-h-10 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {passwordPending ? "Guardando..." : "Cambiar"}
            </button>
            <p className="text-xs text-zinc-500">Se guarda como hash.</p>
            {passwordState.message ? (
              <p
                className={`text-xs font-medium ${
                  passwordState.status === "error"
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {passwordState.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOpenMenu(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
