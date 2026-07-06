/**
 * Comprueba que la migración 004 (RPC validate_ticket_scan) está
 * aplicada en Supabase, llamándola con un hash inexistente. Si está
 * aplicada, responde `invalid` (y deja un intento de prueba en
 * ticket_validations); si no, muestra el error de función no
 * encontrada. No modifica ninguna entrada.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.preview.json scripts/check-scanner-rpc.ts
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1);
  const actorId = admins?.[0]?.id;
  if (!actorId) throw new Error("No hay ningún perfil admin para la prueba.");

  const { data, error } = await admin.rpc("validate_ticket_scan", {
    p_qr_hash: "0".repeat(64),
    p_validator_id: actorId,
    p_metadata: { source: "check-script" },
    p_short_code: null,
  });

  if (error) {
    console.error("RPC NO disponible:", error.message);
    console.error(
      "→ Ejecuta supabase/migrations/004_ticket_scanner_validation.sql en el SQL Editor.",
    );
    process.exit(1);
  }

  console.log("RPC disponible. Respuesta de prueba:", JSON.stringify(data));
  const ok =
    data && typeof data === "object" && (data as { result?: string }).result === "invalid";
  console.log(ok ? "OK: la migración 004 está aplicada." : "Respuesta inesperada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
