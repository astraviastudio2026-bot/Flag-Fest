import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema } from "@/lib/validations";
import type { Profile } from "@/lib/types";

/**
 * POST /api/admin/users/create
 *
 * Crea un usuario (vendedor o validador) en Supabase Auth usando la
 * clave service_role — SOLO en el servidor. Verifica que quien llama
 * sea un admin activo, crea el perfil y registra un audit log.
 */
export async function POST(request: NextRequest) {
  // 1. Verificar que el solicitante sea admin activo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single<Pick<Profile, "id" | "role" | "is_active">>();

  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // 2. Validar el cuerpo.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const { full_name, email, password, role } = parsed.data;

  // 3. Crear el usuario con el cliente admin (service role).
  const admin = createAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

  if (createError || !created.user) {
    const message = createError?.message ?? "No se pudo crear el usuario.";
    const status = /already|exist|registered/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  // 4. Crear/actualizar el perfil de forma autoritativa.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      full_name,
      email,
      role,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    // Revertir el usuario de Auth para no dejar cuentas huérfanas.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `No se pudo crear el perfil: ${profileError.message}` },
      { status: 500 },
    );
  }

  // 5. Registrar audit log (service role salta RLS).
  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    action: "user.create",
    entity_type: "profile",
    entity_id: created.user.id,
    metadata: { email, role },
  });

  return NextResponse.json(
    { ok: true, user: { id: created.user.id, email, role, full_name } },
    { status: 201 },
  );
}
