"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "./ActionButton";
import { TicketIcon } from "./icons";
import { TicketPreviewMock } from "./TicketPreviewMock";
import { FormMessage } from "./admin/FormMessage";
import { FLAG_COLORS, type FlagColorId } from "@/lib/event";

type Result = {
  ok?: boolean;
  error?: string | null;
  message?: string;
  emailSent?: boolean;
};

/**
 * Formulario de venta REAL (fase 3). Envía a `POST /api/tickets/create`,
 * que crea la entrada, genera QR + PDF y despacha el correo. Mantiene la
 * vista previa en vivo de la maqueta.
 */
export function SellTicketForm({
  disabledReason,
}: {
  /** Si se pasa, el formulario queda deshabilitado con este motivo. */
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState<FlagColorId>("verde");
  const [note, setNote] = useState("");

  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<"generating" | "emailing">("generating");
  const [result, setResult] = useState<Result>({});
  const stageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewName = name.trim() || "Nombre del asistente";
  const blocked = Boolean(disabledReason);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (blocked || pending) return;

    setPending(true);
    setResult({});
    setStage("generating");
    stageTimer.current = setTimeout(() => setStage("emailing"), 1400);

    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          selected_color: color,
          notes: note,
        }),
      });
      const data = (await res.json().catch(() => null)) as Result | null;

      if (!res.ok || !data?.ok) {
        setResult({ error: data?.error ?? "No se pudo crear la entrada." });
      } else {
        setResult({
          ok: true,
          message: data.message ?? "Entrada creada y enviada correctamente.",
          emailSent: data.emailSent,
        });
        // Limpiar el formulario y refrescar métricas y lista.
        setName("");
        setEmail("");
        setColor("verde");
        setNote("");
        router.refresh();
      }
    } catch {
      setResult({ error: "Error de red. Inténtalo de nuevo." });
    } finally {
      if (stageTimer.current) clearTimeout(stageTimer.current);
      setPending(false);
    }
  }

  const buttonLabel = pending
    ? stage === "emailing"
      ? "Enviando correo…"
      : "Generando entrada…"
    : "Generar entrada";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Nombre completo del cliente
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. María Fernández"
            required
            minLength={3}
            disabled={pending}
            className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Correo electrónico del cliente
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@correo.com"
            required
            disabled={pending}
            className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Color seleccionado
          </span>
          <div className="grid grid-cols-3 gap-2">
            {FLAG_COLORS.map((c) => {
              const active = color === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  disabled={pending}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-all disabled:opacity-60 ${
                    active
                      ? "bg-surface-2"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                  style={
                    active
                      ? { borderColor: c.hex, boxShadow: `0 0 16px -4px ${c.hex}` }
                      : undefined
                  }
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
                  />
                  <span
                    className="font-condensed text-sm font-semibold uppercase tracking-wide"
                    style={{ color: active ? c.hex : undefined }}
                  >
                    {c.label}
                  </span>
                  <span className="text-[0.6rem] leading-tight text-muted-2">
                    {c.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Observación <span className="text-muted-2">(opcional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={pending}
            placeholder="Notas internas sobre la venta…"
            className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
          />
        </label>

        {disabledReason && (
          <FormMessage error={disabledReason} />
        )}
        <FormMessage ok={result.ok} error={result.error} message={result.message} />

        <ActionButton
          type="submit"
          size="lg"
          fullWidth
          icon={<TicketIcon size={18} />}
          disabled={pending || blocked}
          className="mt-1"
        >
          {buttonLabel}
        </ActionButton>
        <p className="text-center text-xs text-muted-2">
          Se genera el QR y el PDF y se envía automáticamente al correo del
          cliente.
        </p>
      </form>

      <div className="flex flex-col gap-3">
        <p className="font-condensed text-xs uppercase tracking-wider text-muted">
          Vista previa de la entrada
        </p>
        <TicketPreviewMock
          data={{ customerName: previewName, color, ticketNumber: "0001" }}
        />
      </div>
    </div>
  );
}
