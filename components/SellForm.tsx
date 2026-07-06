"use client";

import { useState } from "react";
import { ActionButton } from "./ActionButton";
import { TicketIcon } from "./icons";
import { TicketPreviewMock } from "./TicketPreviewMock";
import { FLAG_COLORS, type FlagColorId } from "@/lib/event";

/**
 * Formulario visual de venta con vista previa en vivo de la entrada.
 * Maqueta de fase 1: no persiste datos ni genera PDF/QR reales.
 */
export function SellForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState<FlagColorId>("verde");
  const [note, setNote] = useState("");

  const previewName = name.trim() || "Nombre del asistente";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulario */}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Nombre completo del cliente
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. María Fernández"
            className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-condensed text-xs uppercase tracking-wider text-muted">
            Correo electrónico
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@correo.com"
            className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
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
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-all ${
                    active
                      ? "bg-surface-2"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: c.hex,
                          boxShadow: `0 0 16px -4px ${c.hex}`,
                        }
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
            placeholder="Notas internas sobre la venta…"
            className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <ActionButton
          type="submit"
          size="lg"
          fullWidth
          icon={<TicketIcon size={18} />}
          className="mt-1"
        >
          Generar entrada
        </ActionButton>
        <p className="text-center text-xs text-muted-2">
          Vista previa en tiempo real · la generación real de PDF y QR llegará
          en la siguiente fase.
        </p>
      </form>

      {/* Vista previa */}
      <div className="flex flex-col gap-3">
        <p className="font-condensed text-xs uppercase tracking-wider text-muted">
          Vista previa de la entrada
        </p>
        <TicketPreviewMock
          data={{
            customerName: previewName,
            color,
            ticketNumber: "0001",
          }}
        />
      </div>
    </div>
  );
}
