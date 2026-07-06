"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/permissions";
import { normalizeInternalEmail } from "@/lib/internal-users";
import type { UserRole } from "@/lib/types";

const loginSchema = z.object({
  // Puede ser un usuario interno ("admin") o un correo interno completo.
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export interface LoginState {
  error: string | null;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Introduce un usuario y una contraseña válidos." };
  }

  const email = normalizeInternalEmail(parsed.data.identifier);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      error: "Credenciales incorrectas. Verifica tu correo y contraseña.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single<{ role: UserRole; is_active: boolean }>();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: "Tu cuenta no tiene un perfil asignado. Contacta al administrador.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: "Tu cuenta está desactivada. Contacta al administrador.",
    };
  }

  redirect(roleHome(profile.role));
}
