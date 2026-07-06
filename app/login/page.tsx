import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: "Ingresar · Flag-Fest",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const inactive = error === "inactive";

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
              Accede con tu cuenta de administrador, vendedor o control de
              acceso.
            </p>
          </div>

          {inactive && (
            <div className="mb-4 rounded-xl border border-flag-yellow/30 bg-flag-yellow/10 px-3.5 py-3 text-sm text-flag-yellow-glow">
              Tu sesión ha finalizado o tu cuenta está inactiva. Vuelve a
              ingresar.
            </div>
          )}

          <LoginForm />
        </div>

        <p className="mt-6 text-center font-condensed text-xs uppercase tracking-wider text-muted-2">
          {EVENT.name} · {EVENT.date} · {EVENT.venue}
        </p>
      </div>
    </main>
  );
}
