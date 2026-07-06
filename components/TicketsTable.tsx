"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, type TicketStatus as BadgeStatus } from "./StatusBadge";
import { DownloadIcon, MailIcon } from "./icons";
import { formatCurrency, formatDate, getFlagColor } from "@/lib/event";
import type { TicketRow } from "@/lib/data";
import type { TicketStatus } from "@/lib/types";

const STATUS_BADGE: Record<TicketStatus, { badge: BadgeStatus; label: string }> = {
  sold: { badge: "valid", label: "Vendida" },
  used: { badge: "used", label: "Usada" },
  cancelled: { badge: "void", label: "Anulada" },
};

type Feedback = { id: string; ok: boolean; text: string } | null;

/**
 * Tabla de ventas reales con descarga de PDF y reenvío de correo.
 * Se usa en el panel del vendedor (sin columna de vendedor) y en el de
 * administración (`showSeller`).
 */
export function TicketsTable({
  tickets,
  showSeller = false,
}: {
  tickets: TicketRow[];
  showSeller?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function resend(id: string) {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tickets/${id}/resend`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setFeedback({ id, ok: false, text: data?.error ?? "No se pudo reenviar." });
      } else {
        setFeedback({ id, ok: true, text: data.message ?? "Correo reenviado." });
        router.refresh();
      }
    } catch {
      setFeedback({ id, ok: false, text: "Error de red." });
    } finally {
      setBusyId(null);
    }
  }

  const colCount = showSeller ? 10 : 9;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-condensed font-medium">Código</th>
            {showSeller && (
              <th className="px-4 py-3 font-condensed font-medium">Vendedor</th>
            )}
            <th className="px-4 py-3 font-condensed font-medium">Cliente</th>
            <th className="px-4 py-3 font-condensed font-medium">Color</th>
            <th className="px-4 py-3 font-condensed font-medium">Fase</th>
            <th className="px-4 py-3 font-condensed font-medium">Precio</th>
            <th className="px-4 py-3 font-condensed font-medium">Estado</th>
            <th className="px-4 py-3 font-condensed font-medium">Venta</th>
            <th className="px-4 py-3 font-condensed font-medium">Correo</th>
            <th className="px-4 py-3 font-condensed font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const c = getFlagColor(t.selected_color);
            const st = STATUS_BADGE[t.status];
            const emailed = Boolean(t.email_sent_at);
            const busy = busyId === t.id;
            return (
              <tr
                key={t.id}
                className="border-b border-border/60 last:border-0 align-top hover:bg-surface-2/50"
              >
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {t.short_code ?? `#${t.ticket_number}`}
                </td>
                {showSeller && (
                  <td className="px-4 py-3 text-muted">{t.seller_name ?? "—"}</td>
                )}
                <td className="px-4 py-3">
                  <span className="block font-medium text-foreground">
                    {t.customer_name}
                  </span>
                  <span className="block text-xs text-muted-2">
                    {t.customer_email}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
                    />
                    {c.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{t.phase_name ?? "—"}</td>
                <td className="px-4 py-3 text-foreground">
                  {formatCurrency(Number(t.price))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={st.badge}>{st.label}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-2 whitespace-nowrap">
                  {formatDate(t.sold_at)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      emailed ? "text-flag-green-glow" : "text-muted-2"
                    }
                  >
                    {emailed ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/api/tickets/${t.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-surface-3"
                      title="Descargar PDF"
                    >
                      <DownloadIcon size={14} />
                      PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => resend(t.id)}
                      disabled={busy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 text-xs font-semibold uppercase tracking-wide text-accent-glow transition-colors hover:bg-accent/20 disabled:opacity-50"
                      title="Reenviar correo"
                    >
                      <MailIcon size={14} />
                      {busy ? "Enviando…" : "Reenviar"}
                    </button>
                  </div>
                  {feedback?.id === t.id && (
                    <p
                      className={`mt-1.5 text-right text-xs ${
                        feedback.ok ? "text-flag-green-glow" : "text-flag-red-glow"
                      }`}
                    >
                      {feedback.text}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-muted">
                Aún no hay ventas registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
