import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin, readJson } from "@/lib/api-guard";
import { createPhaseSchema } from "@/lib/validations";

/**
 * POST /api/admin/phases/create
 *
 * Crea una fase de venta para el evento indicado. Verifica admin,
 * valida (event_id, name, phase_order, start_date/end_date —o los alias
 * starts_at/ends_at—, price, is_active) con zod y registra un audit log.
 * El esquema normaliza las fechas (solo día) a timestamps de Ecuador.
 * Reemplaza la Server Action `savePhase`.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, caller } = guard;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  const parsed = createPhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("sale_phases")
    .insert({
      event_id: parsed.data.event_id,
      name: parsed.data.name,
      phase_order: parsed.data.phase_order,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      price: parsed.data.price,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return NextResponse.json(
      { error: `No se pudo crear la fase: ${error.message}` },
      { status: 400 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: caller.id,
    action: "phase.create",
    entity_type: "sale_phase",
    entity_id: data.id,
    metadata: { name: parsed.data.name, event_id: parsed.data.event_id },
  });

  return NextResponse.json({ ok: true, id: data.id, message: "Fase creada." });
}
