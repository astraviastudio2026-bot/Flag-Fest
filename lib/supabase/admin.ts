import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo de Supabase con la clave service_role.
 *
 * ⚠️ SOLO SERVIDOR. La importación de "server-only" garantiza que este
 * módulo nunca llegue a un bundle de cliente. Salta las políticas RLS,
 * por lo que debe usarse únicamente en endpoints/acciones que ya hayan
 * verificado los permisos del solicitante.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
        "Configúralas en .env.local (la service role nunca en cliente).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
