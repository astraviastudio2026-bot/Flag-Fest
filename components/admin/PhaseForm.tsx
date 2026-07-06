"use client";

import { useActionState } from "react";
import { savePhase } from "@/app/admin/actions";
import { idleActionState } from "@/app/admin/action-state";
import { ActionButton } from "@/components/ActionButton";
import { PlusIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";

/** Crea una fase de venta para el evento indicado. */
export function PhaseForm({
  eventId,
  nextOrder,
}: {
  eventId: string;
  nextOrder: number;
}) {
  const [state, formAction, pending] = useActionState(savePhase, idleActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />

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
            type="datetime-local"
            name="starts_at"
            required
            className={fieldInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Fin</span>
          <input
            type="datetime-local"
            name="ends_at"
            required
            className={fieldInput}
          />
        </label>
      </div>

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

      <FormMessage ok={state.ok} error={state.error} message={state.message} />

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
