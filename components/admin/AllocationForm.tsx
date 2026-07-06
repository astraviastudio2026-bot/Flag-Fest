"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { PlusIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";
import type { Profile } from "@/lib/types";

type Result = { ok?: boolean; error?: string | null; message?: string };

/** Asigna un cupo de entradas a un vendedor vía API route. */
export function AllocationForm({
  eventId,
  sellers,
}: {
  eventId: string;
  sellers: Pick<Profile, "id" | "full_name" | "email">[];
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
      seller_id: String(fd.get("seller_id") ?? ""),
      allocated_quantity: Number(fd.get("allocated_quantity") ?? 0),
    };

    try {
      const res = await fetch("/api/admin/allocations/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as Result | null;

      if (!res.ok || !data?.ok) {
        setResult({ error: data?.error ?? "No se pudo asignar el cupo." });
      } else {
        setResult({ ok: true, message: data.message ?? "Cupo asignado." });
        router.refresh();
      }
    } catch {
      setResult({ error: "Error de red. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }

  if (sellers.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aún no hay vendedores activos. Crea un vendedor para poder asignarle un
        cupo.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Vendedor</span>
          <select name="seller_id" required className={fieldInput}>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} · {s.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Cupo asignado</span>
          <input
            type="number"
            name="allocated_quantity"
            min={0}
            required
            placeholder="50"
            className={fieldInput}
          />
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
        {pending ? "Asignando…" : "Asignar cupo"}
      </ActionButton>
    </form>
  );
}
