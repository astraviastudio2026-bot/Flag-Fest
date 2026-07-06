import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin, readJson } from "@/lib/api-guard";
import { allocationSchema } from "@/lib/validations";

/**
 * POST /api/admin/allocations/upsert
 *
 * Asigna (o actualiza) el cupo de un vendedor para el evento. Verifica
 * admin, valida (event_id, seller_id, allocated_quantity ≥ 0) con zod,
 * hace upsert por (event_id, seller_id) y registra un audit log.
 * Reemplaza la Server Action `saveAllocation`.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, caller } = guard;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  const parsed = allocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const { error } = await supabase.from("seller_allocations").upsert(
    {
      event_id: parsed.data.event_id,
      seller_id: parsed.data.seller_id,
      allocated_quantity: parsed.data.allocated_quantity,
    },
    { onConflict: "event_id,seller_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: `No se pudo asignar el cupo: ${error.message}` },
      { status: 400 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: caller.id,
    action: "allocation.upsert",
    entity_type: "seller_allocation",
    entity_id: null,
    metadata: {
      seller_id: parsed.data.seller_id,
      event_id: parsed.data.event_id,
      quantity: parsed.data.allocated_quantity,
    },
  });

  return NextResponse.json({ ok: true, message: "Cupo asignado." });
}
