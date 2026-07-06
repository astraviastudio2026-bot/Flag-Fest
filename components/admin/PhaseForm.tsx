"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { PlusIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";

type Result = { ok?: boolean; error?: string | null; message?: string };

/** Crea una fase de venta vía `POST /api/admin/phases/create`. */
export function PhaseForm({
  eventId,
  nextOrder,
}: {
  eventId: string;
  nextOrder: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult({});

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      event_id: eventId,
      name: String(fd.get("name") ?? ""),
      phase_order: Number(fd.get("phase_order") ?? 0),
      start_date: String(fd.get("start_date") ?? ""),
      end_date: String(fd.get("end_date") ?? ""),
      price: Number(fd.get("price") ?? 0),
      is_active: fd.get("is_active") != null,
    };

    try {
      const res = await fetch("/api/admin/phases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as Result | null;

      if (!res.ok || !data?.ok) {
        setResult({ error: data?.error ?? "No se pudo crear la fase." });
      } else {
        setResult({ ok: true, message: data.message ?? "Fase creada." });
        form.reset();
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Nombre de la fase</span>
          <input
            name="name"
            required
            placeholder="Preventa"
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Orden</span>
          <input
            type="number"
            name="phase_order"
            min={1}
            required
            defaultValue={nextOrder}
            className={fieldInput}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Inicio</span>
          <input
            type="date"
            name="start_date"
            required
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Fin</span>
          <input
            type="date"
            name="end_date"
            required
            className={fieldInput}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Precio (USD)</span>
          <input
            type="number"
            name="price"
            min={0}
            step="0.01"
            required
            placeholder="12.00"
            className={fieldInput}
          />
        </label>
        <label className="flex items-center gap-2.5 pt-6">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">Fase activa</span>
        </label>
      </div>

      <FormMessage ok={result.ok} error={result.error} message={result.message} />

      <ActionButton
        type="submit"
        size="lg"
        disabled={pending}
        icon={<PlusIcon size={18} />}
        className="mt-1 self-start"
      >
        {pending ? "Creando…" : "Crear fase"}
      </ActionButton>
    </form>
  );
}
