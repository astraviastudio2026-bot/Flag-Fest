"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { SettingsIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";
import type { Event } from "@/lib/types";

type Result = { ok?: boolean; error?: string | null; message?: string };

/**
 * Crea o edita el evento vía `POST /api/admin/events/upsert`.
 * Si recibe `event`, precarga sus datos y envía su `id` para editar el
 * evento activo (sin duplicar). Usa fetch en lugar de Server Actions.
 */
export function EventForm({ event }: { event?: Event | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      id: event?.id ?? undefined,
      name: String(fd.get("name") ?? ""),
      location: String(fd.get("location") ?? ""),
      event_date: String(fd.get("event_date") ?? ""),
      total_tickets: Number(fd.get("total_tickets") ?? 0),
      is_active: fd.get("is_active") != null,
    };

    try {
      const res = await fetch("/api/admin/events/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as Result | null;

      if (!res.ok || !data?.ok) {
        setResult({ error: data?.error ?? "No se pudo guardar el evento." });
      } else {
        setResult({ ok: true, message: data.message ?? "Evento guardado." });
        router.refresh();
      }
    } catch {
      setResult({ error: "Error de red. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Nombre del evento</span>
        <input
          name="name"
          required
          defaultValue={event?.name ?? ""}
          placeholder="Flags Fest"
          className={fieldInput}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Ubicación</span>
          <input
            name="location"
            defaultValue={event?.location ?? ""}
            placeholder="Paradox Club"
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Fecha</span>
          <input
            type="date"
            name="event_date"
            required
            defaultValue={event?.event_date ?? ""}
            className={fieldInput}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Total de entradas</span>
          <input
            type="number"
            name="total_tickets"
            min={1}
            required
            defaultValue={event?.total_tickets ?? 600}
            className={fieldInput}
          />
        </label>
        <label className="flex items-center gap-2.5 pt-6">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={event?.is_active ?? true}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">Evento activo</span>
        </label>
      </div>

      <FormMessage ok={result.ok} error={result.error} message={result.message} />

      <ActionButton
        type="submit"
        size="lg"
        disabled={pending}
        icon={<SettingsIcon size={18} />}
        className="mt-1 self-start"
      >
        {pending ? "Guardando…" : event ? "Guardar cambios" : "Crear evento"}
      </ActionButton>
    </form>
  );
}
