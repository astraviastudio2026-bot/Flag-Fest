"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().trim().email(),
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
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Introduce un correo y una contraseña válidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

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
