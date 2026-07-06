"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "./ActionButton";
import { AlertIcon, ArrowRightIcon, LockIcon, MailIcon } from "./icons";

/**
 * Formulario de inicio de sesión conectado a Supabase Auth.
 *
 * Envía las credenciales a `POST /api/auth/login` (Route Handler), que
 * abre la sesión y responde con la ruta de inicio según el rol. Evita el
 * uso de Server Actions, que provocaba "Invalid Server Actions request".
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = (await res.json().catch(() => null)) as
        | { redirectTo?: string; error?: string }
        | null;

      if (!res.ok || !data?.redirectTo) {
        setError(
          data?.error ??
            "No se pudo iniciar sesión. Inténtalo de nuevo.",
        );
        setPending(false);
        return;
      }

      // Sesión iniciada: navegar a la página de inicio del rol.
      // Mantenemos `pending` activo durante la transición.
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-condensed text-xs uppercase tracking-wider text-muted">
          Usuario o correo interno
        </span>
        <div className="relative">
          <MailIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
          />
          <input
            type="text"
            name="identifier"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="admin"
            className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <span className="text-xs text-muted-2">
          Ejemplo: admin@flagfest.local
        </span>
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

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-flag-red/30 bg-flag-red/10 px-3.5 py-3 text-sm text-flag-red-glow"
        >
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
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
