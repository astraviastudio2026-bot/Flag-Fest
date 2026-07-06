import Link from "next/link";
import type { Metadata } from "next";
import { ActionButton } from "@/components/ActionButton";
import { ArrowRightIcon, LockIcon, MailIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Ingresar · Flag-Fest",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md animate-fade-up">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <p className="font-condensed text-sm uppercase tracking-wider text-muted">
            Sistema de venta y validación QR de entradas
          </p>
        </div>

        {/* Tarjeta */}
        <div className="glass-card p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="font-condensed text-2xl font-semibold uppercase tracking-wide text-foreground">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-muted">
              Accede con tu cuenta de administrador o vendedor.
            </p>
          </div>

          {/* Formulario visual — sin lógica de autenticación todavía */}
          <form className="flex flex-col gap-4">
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-border bg-surface-2 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
                />
              </div>
            </label>

            <ActionButton
              href="/admin"
              size="lg"
              fullWidth
              icon={<ArrowRightIcon size={18} />}
              className="mt-2"
            >
              Ingresar
            </ActionButton>
          </form>

          {/* Accesos rápidos de maqueta a cada rol */}
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-center font-condensed text-[0.65rem] uppercase tracking-wider text-muted-2">
              Vistas de demostración
            </p>
            <div className="grid grid-cols-3 gap-2">
              <RoleShortcut href="/admin" label="Admin" />
              <RoleShortcut href="/seller" label="Vendedor" />
              <RoleShortcut href="/scanner" label="Escáner" />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-condensed text-xs uppercase tracking-wider text-muted-2">
          {EVENT.name} · {EVENT.date} · {EVENT.venue}
        </p>
      </div>
    </main>
  );
}

function RoleShortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface-2 py-2 text-center font-condensed text-xs font-medium uppercase tracking-wide text-muted transition-colors hover:border-accent/40 hover:text-foreground"
    >
      {label}
    </Link>
  );
}
