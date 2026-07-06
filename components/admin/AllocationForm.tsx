"use client";

import { useActionState } from "react";
import { saveAllocation } from "@/app/admin/actions";
import { idleActionState } from "@/app/admin/action-state";
import { ActionButton } from "@/components/ActionButton";
import { PlusIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";
import type { Profile } from "@/lib/types";

/** Asigna un cupo de entradas a un vendedor. */
export function AllocationForm({
  eventId,
  sellers,
}: {
  eventId: string;
  sellers: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [state, formAction, pending] = useActionState(
    saveAllocation,
    idleActionState,
  );

  if (sellers.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aún no hay vendedores activos. Crea un vendedor para poder asignarle un
        cupo.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />

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

      <FormMessage ok={state.ok} error={state.error} message={state.message} />

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
