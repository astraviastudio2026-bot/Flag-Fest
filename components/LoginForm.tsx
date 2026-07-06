"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";
import { ActionButton } from "./ActionButton";
import { AlertIcon, ArrowRightIcon, LockIcon, MailIcon } from "./icons";

const initialState: LoginState = { error: null };

/** Formulario de inicio de sesión conectado a Supabase Auth. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-condensed text-xs uppercase tracking-wider text-muted">
          Correo electrónico
        </span>
        <div className="relative">
          <MailIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
          />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
            className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-condensed text-xs uppercase tracking-wider text-muted">
          Contraseña
        </span>
        <div className="relative">
          <LockIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
          />
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </label>

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-flag-red/30 bg-flag-red/10 px-3.5 py-3 text-sm text-flag-red-glow"
        >
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <ActionButton
        type="submit"
        size="lg"
        fullWidth
        disabled={pending}
        icon={<ArrowRightIcon size={18} />}
        className="mt-2"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </ActionButton>
    </form>
  );
}
