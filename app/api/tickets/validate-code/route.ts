import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, readJson } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCodeSchema } from "@/lib/validations";
import { normalizeShortCode } from "@/lib/tickets/parse-scanned-qr";
import {
  runTicketValidation,
  logUnreadableScan,
} from "@/lib/tickets/validate";

export const runtime = "nodejs";

/**
 * POST /api/tickets/validate-code
 *
 * Validación manual por código corto ("FF-0001") para cuando el QR no
 * se puede leer (pantalla dañada, papel arrugado). Solo admin/validator.
 * Aplica la misma lógica atómica que el escaneo y registra el intento.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["validator", "admin"]);
  if (!guard.ok) return guard.response;
  const { caller } = guard;

  const body = await readJson(request);
  const parsed = validateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();
  const shortCode = normalizeShortCode(parsed.data.code);

  if (!shortCode) {
    await logUnreadableScan(admin, caller.id, {
      source: "manual",
      code: parsed.data.code.slice(0, 40),
    });
    return NextResponse.json({
      status: "invalid",
      message: "El código no tiene el formato FF-0001.",
    });
  }

  try {
    const result = await runTicketValidation(admin, {
      shortCode,
      validatorId: caller.id,
      metadata: { source: "manual", code: shortCode },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
