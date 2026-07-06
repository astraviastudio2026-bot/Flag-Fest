import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { QrIcon } from "@/components/icons";
import { ValidateTicketButton } from "@/components/ValidateTicketButton";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Validación de entrada · Flag-Fest",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Destino del QR de la entrada: `/ticket/validate/[token]`.
 *
 * Abrir el enlace NUNCA valida la entrada (si no, cualquier asistente
 * podría marcarla como usada desde su casa). Solo el personal
 * autorizado (admin/validator autenticado) ve el botón de validar,
 * que llama al mismo endpoint atómico que el escáner.
 */
export default async function ValidateTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const profile = await getProfile();
  const canValidate =
    !!profile &&
    profile.is_active &&
    (profile.role === "admin" || profile.role === "validator");

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
          Código QR detectado
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Para validar esta entrada usa el escáner autorizado de Flag Fest en
          la puerta del evento. Abrir este enlace no marca la entrada como
          usada.
        </p>

        {canValidate && <ValidateTicketButton token={token} />}

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
