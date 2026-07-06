import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { QrIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Validación de entrada · Flag-Fest",
  robots: { index: false, follow: false },
};

/**
 * Destino del QR de la entrada: `/ticket/validate/[token]`.
 *
 * En fase 3 es solo una pantalla informativa. La validación real del
 * ingreso (marcar como usada, cámara, etc.) se activa en la fase 4.
 */
export default async function ValidateTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // El token se lee para dejar la ruta preparada; aún no se valida nada.
  await params;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>

        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-accent-glow ring-1 ring-accent/30">
          <QrIcon size={26} />
        </span>

        <h1 className="font-condensed text-xl font-semibold uppercase tracking-wide text-foreground">
          Validación QR pendiente
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Validación QR pendiente de activar en fase 4. Este código se leerá en
          el ingreso al evento el día del show.
        </p>

        <p className="mt-6 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted-2">
          Entrada única e intransferible · Este código QR será válido una sola
          vez.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-accent-glow transition-opacity hover:opacity-80"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
