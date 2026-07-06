import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/logout
 *
 * Cierra la sesión de Supabase Auth. Al ser un Route Handler puede
 * borrar las cookies de sesión en la respuesta. Reemplaza la Server
 * Action `signOut` (que fallaba con "Invalid Server Actions request"
 * detrás del proxy).
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
