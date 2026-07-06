import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin, readJson } from "@/lib/api-guard";

const toggleSchema = z.object({
  user_id: z.string().uuid("Usuario no válido."),
  next_active: z.boolean(),
});

/**
 * POST /api/admin/users/toggle
 *
 * Activa o desactiva un usuario. Verifica admin, valida el cuerpo y
 * registra un audit log. Reemplaza la Server Action `toggleUserActive`.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, caller } = guard;

  const body = await readJson(request);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const { user_id, next_active } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: next_active })
    .eq("id", user_id);

  if (error) {
    return NextResponse.json(
      { error: `No se pudo actualizar el usuario: ${error.message}` },
      { status: 400 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: caller.id,
    action: next_active ? "user.activate" : "user.deactivate",
    entity_type: "profile",
    entity_id: user_id,
    metadata: null,
  });

  return NextResponse.json({
    ok: true,
    message: next_active ? "Usuario activado." : "Usuario desactivado.",
  });
}
