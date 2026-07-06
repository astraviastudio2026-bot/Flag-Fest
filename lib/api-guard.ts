import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

type AdminCaller = Pick<Profile, "id" | "role" | "is_active">;
type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminGuard =
  | { ok: true; supabase: ServerClient; caller: AdminCaller }
  | { ok: false; response: NextResponse };

export type RoleGuard =
  | { ok: true; supabase: ServerClient; caller: AdminCaller }
  | { ok: false; response: NextResponse };

/**
 * Verifica sesión + rol admin activo para los Route Handlers del panel.
 *
 * Devuelve el cliente Supabase ligado a la sesión (respeta RLS) y el
 * perfil del solicitante, o una respuesta 401/403 lista para devolver.
 * Centraliza el patrón usado por los endpoints de administración y
 * sustituye la verificación que antes hacían las Server Actions.
 */
export async function requireApiAdmin(): Promise<AdminGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single<AdminCaller>();

  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    };
  }

  return { ok: true, supabase, caller };
}

/**
 * Verifica sesión + que el usuario tenga uno de los roles permitidos y
 * esté activo. Devuelve el cliente ligado a la sesión y el perfil del
 * solicitante, o una respuesta 401/403 lista para devolver.
 */
export async function requireApiRole(
  allowed: UserRole[],
): Promise<RoleGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single<AdminCaller>();

  if (!caller || !caller.is_active || !allowed.includes(caller.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    };
  }

  return { ok: true, supabase, caller };
}

/** Lee y parsea el cuerpo JSON, devolviendo null si no es válido. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
