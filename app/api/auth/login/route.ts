import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";
import { normalizeInternalEmail } from "@/lib/internal-users";
import { roleHome } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

/**
 * POST /api/auth/login
 *
 * Autentica a un usuario interno contra Supabase Auth y devuelve la ruta
 * de inicio según su rol. Acepta un usuario interno ("admin") o un correo
 * interno completo ("admin@flagfest.local") y lo normaliza a un email
 * `@flagfest.local` antes de autenticar.
 *
 * Al ser un Route Handler, `signInWithPassword` puede escribir las cookies
 * de sesión en la respuesta (a diferencia de un Server Component). El
 * cliente sólo tiene que hacer `router.push(redirectTo)`.
 *
 * Respuestas:
 * - 200 { redirectTo }        → sesión iniciada
 * - 400/401/403 { error }     → datos inválidos, credenciales o cuenta
 */
export async function POST(request: NextRequest) {
  // 1. Validar el cuerpo.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Introduce un usuario y una contraseña válidos.",
      },
      { status: 400 },
    );
  }

  // 2. Normalizar usuario interno → correo y autenticar.
  const email = normalizeInternalEmail(parsed.data.identifier);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Credenciales incorrectas. Verifica tu usuario y contraseña." },
      { status: 401 },
    );
  }

  // 3. Cargar el perfil para obtener el rol y el estado de la cuenta.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single<{ role: UserRole; is_active: boolean }>();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: "Tu cuenta no tiene un perfil asignado. Contacta al administrador.",
      },
      { status: 403 },
    );
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Tu cuenta está desactivada. Contacta al administrador." },
      { status: 403 },
    );
  }

  // 4. Sesión válida: devolver la ruta de inicio según el rol.
  return NextResponse.json({ redirectTo: roleHome(profile.role) });
}
