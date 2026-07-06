"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/admin/actions";
import { idleActionState } from "@/app/admin/action-state";
import { ActionButton } from "@/components/ActionButton";
import { SettingsIcon } from "@/components/icons";
import { FormMessage, fieldInput, fieldLabel } from "./FormMessage";
import type { Event } from "@/lib/types";

/** Crea o edita el evento. Si recibe `event`, precarga sus datos. */
export function EventForm({ event }: { event?: Event | null }) {
  const [state, formAction, pending] = useActionState(saveEvent, idleActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}

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

      <FormMessage ok={state.ok} error={state.error} message={state.message} />

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
