import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin, readJson } from "@/lib/api-guard";
import { createEventSchema } from "@/lib/validations";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * POST /api/admin/events/upsert
 *
 * Crea o actualiza el evento. Si el cuerpo trae `id`, actualiza ese
 * evento (edición del evento activo — no duplica). Si se marca activo,
 * desactiva los demás para mantener un único evento activo. Verifica
 * admin, valida con zod y registra un audit log. Reemplaza la Server
 * Action `saveEvent`.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, caller } = guard;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;

  const parsed = createEventSchema.safeParse({
    name: raw.name,
    location: raw.location,
    event_date: raw.event_date,
    total_tickets: raw.total_tickets,
    is_active: raw.is_active,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const values = {
    name: parsed.data.name,
    location: parsed.data.location || null,
    event_date: parsed.data.event_date,
    total_tickets: parsed.data.total_tickets,
    is_active: parsed.data.is_active,
  };

  // Un único evento activo a la vez.
  if (values.is_active) {
    await supabase
      .from("events")
      .update({ is_active: false })
      .neq("id", id ?? NIL_UUID);
  }

  let entityId = id;
  if (id) {
    const { error } = await supabase.from("events").update(values).eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: `No se pudo actualizar el evento: ${error.message}` },
        { status: 400 },
      );
    }
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert(values)
      .select("id")
      .single<{ id: string }>();
    if (error) {
      return NextResponse.json(
        { error: `No se pudo crear el evento: ${error.message}` },
        { status: 400 },
      );
    }
    entityId = data.id;
  }

  await supabase.from("audit_logs").insert({
    actor_id: caller.id,
    action: id ? "event.update" : "event.create",
    entity_type: "event",
    entity_id: entityId,
    metadata: { name: values.name },
  });

  return NextResponse.json({
    ok: true,
    id: entityId,
    message: id ? "Evento actualizado." : "Evento creado.",
  });
}
