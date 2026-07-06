"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  allocationSchema,
  createEventSchema,
  createPhaseSchema,
} from "@/lib/validations";
import type { Profile } from "@/lib/types";
import type { ActionState } from "./action-state";

/** Verifica que quien ejecuta la acción sea un admin activo. */
async function requireAdmin(): Promise<Profile | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) return null;
  return profile;
}

/** Crea o actualiza el evento. Si se marca activo, desactiva los demás. */
export async function saveEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const parsed = createEventSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location"),
    event_date: formData.get("event_date"),
    total_tickets: formData.get("total_tickets"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const id = (formData.get("id") as string) || null;
  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    location: parsed.data.location || null,
    event_date: parsed.data.event_date,
    total_tickets: parsed.data.total_tickets,
    is_active: parsed.data.is_active,
  };

  if (values.is_active) {
    // Un solo evento activo a la vez.
    await supabase.from("events").update({ is_active: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  }

  let entityId = id;
  if (id) {
    const { error } = await supabase.from("events").update(values).eq("id", id);
    if (error) return { ok: false, error: `No se pudo actualizar el evento: ${error.message}` };
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert(values)
      .select("id")
      .single<{ id: string }>();
    if (error) return { ok: false, error: `No se pudo crear el evento: ${error.message}` };
    entityId = data.id;
  }

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: id ? "event.update" : "event.create",
    entity_type: "event",
    entity_id: entityId,
    metadata: { name: values.name },
  });

  revalidatePath("/admin");
  return { ok: true, error: null, message: id ? "Evento actualizado." : "Evento creado." };
}

/** Crea una fase de venta para el evento indicado. */
export async function savePhase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const eventId = formData.get("event_id") as string;
  if (!eventId) return { ok: false, error: "No hay un evento seleccionado." };

  const parsed = createPhaseSchema.safeParse({
    name: formData.get("name"),
    phase_order: formData.get("phase_order"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sale_phases")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      phase_order: parsed.data.phase_order,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
      price: parsed.data.price,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { ok: false, error: `No se pudo crear la fase: ${error.message}` };

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "phase.create",
    entity_type: "sale_phase",
    entity_id: data.id,
    metadata: { name: parsed.data.name, event_id: eventId },
  });

  revalidatePath("/admin");
  return { ok: true, error: null, message: "Fase creada." };
}

/** Asigna (o actualiza) el cupo de un vendedor para el evento. */
export async function saveAllocation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const eventId = formData.get("event_id") as string;
  if (!eventId) return { ok: false, error: "No hay un evento seleccionado." };

  const parsed = allocationSchema.safeParse({
    seller_id: formData.get("seller_id"),
    allocated_quantity: formData.get("allocated_quantity"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("seller_allocations")
    .upsert(
      {
        event_id: eventId,
        seller_id: parsed.data.seller_id,
        allocated_quantity: parsed.data.allocated_quantity,
      },
      { onConflict: "event_id,seller_id" },
    );

  if (error) return { ok: false, error: `No se pudo asignar el cupo: ${error.message}` };

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "allocation.upsert",
    entity_type: "seller_allocation",
    entity_id: null,
    metadata: {
      seller_id: parsed.data.seller_id,
      event_id: eventId,
      quantity: parsed.data.allocated_quantity,
    },
  });

  revalidatePath("/admin");
  return { ok: true, error: null, message: "Cupo asignado." };
}

/** Activa o desactiva un usuario (Server Action de formulario simple). */
export async function toggleUserActive(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const userId = formData.get("user_id") as string;
  const nextActive = formData.get("next_active") === "true";
  if (!userId) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: nextActive }).eq("id", userId);

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: nextActive ? "user.activate" : "user.deactivate",
    entity_type: "profile",
    entity_id: userId,
    metadata: null,
  });

  revalidatePath("/admin");
}
