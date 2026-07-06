import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/types";

export interface SessionContext {
  user: User | null;
  profile: Profile | null;
}

/**
 * Obtiene el usuario autenticado y su perfil.
 * Memoizado por petición con `cache()` para evitar consultas repetidas
 * entre el layout, la página y las comprobaciones de rol.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    return { user, profile: profile ?? null };
  },
);

/** Devuelve el perfil actual o null. */
export async function getProfile(): Promise<Profile | null> {
  const { profile } = await getSessionContext();
  return profile;
}

/**
 * Exige sesión activa. Redirige a /login si no hay usuario.
 * Devuelve siempre un perfil válido y activo.
 */
export async function requireUser(): Promise<Profile> {
  const { user, profile } = await getSessionContext();
  if (!user) redirect("/login");
  if (!profile || !profile.is_active) redirect("/login?error=inactive");
  return profile;
}

/**
 * Exige que el usuario tenga uno de los roles permitidos.
 * - Sin sesión → /login
 * - Cuenta inactiva → /login?error=inactive
 * - Rol no permitido → su propia página de inicio (acceso denegado suave)
 */
export async function requireRole(
  allowed: UserRole[],
): Promise<Profile> {
  const profile = await requireUser();
  if (!allowed.includes(profile.role)) {
    redirect(roleHome(profile.role));
  }
  return profile;
}
