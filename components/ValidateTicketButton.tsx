"use client";

import { useState } from "react";
import { ActionButton } from "./ActionButton";
import { QrIcon } from "./icons";
import type { ScanApiResponse } from "@/lib/tickets/parse-scanned-qr";

const RESULT_STYLE: Record<
  ScanApiResponse["status"],
  { tone: string; title: string }
> = {
  valid: { tone: "#2fd35a", title: "ENTRADA VÁLIDA" },
  already_used: { tone: "#f5b800", title: "ENTRADA YA USADA" },
  cancelled: { tone: "#e11d2e", title: "ENTRADA ANULADA" },
  invalid: { tone: "#e11d2e", title: "QR INVÁLIDO" },
};

/**
 * Botón de validación para /ticket/validate/[token], visible SOLO para
 * admin/validator autenticados. Llama al mismo endpoint que el escáner;
 * abrir el enlace nunca valida por sí solo.
 */
export function ValidateTicketButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ScanApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function validate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannedValue: token, source: "link" }),
      });
      const data = (await res.json().catch(() => null)) as
        | (ScanApiResponse & { error?: string })
        | null;
      if (!res.ok || !data?.status) {
        setError(data?.error ?? "No se pudo validar la entrada.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const style = RESULT_STYLE[result.status];
    return (
      <div
        className="mt-6 rounded-xl border px-4 py-4 text-center"
        style={{ borderColor: `${style.tone}66`, background: `${style.tone}14` }}
      >
        <p
          className="font-display text-xl uppercase tracking-wide"
          style={{ color: style.tone }}
        >
          {style.title}
        </p>
        <p className="mt-1 text-sm text-muted">{result.message}</p>
        {result.ticket && (
          <p className="mt-2 text-xs text-muted-2">
            {result.ticket.short_code} · {result.ticket.customer_name}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ActionButton
        onClick={validate}
        size="lg"
        fullWidth
        disabled={pending}
        icon={<QrIcon size={18} />}
      >
        {pending ? "Validando…" : "Validar esta entrada"}
      </ActionButton>
      {error && <p className="mt-2 text-xs text-flag-red-glow">{error}</p>}
    </div>
  );
}
