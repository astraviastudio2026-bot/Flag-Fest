import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, readJson } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateScanSchema } from "@/lib/validations";
import { hashQrToken } from "@/lib/tickets/qr";
import { parseScannedQr } from "@/lib/tickets/parse-scanned-qr";
import {
  runTicketValidation,
  logUnreadableScan,
} from "@/lib/tickets/validate";

// node:crypto (hash del token) requiere el runtime de Node.
export const runtime = "nodejs";

/**
 * POST /api/tickets/validate
 *
 * Valida una entrada a partir del contenido escaneado del QR (URL
 * completa, ruta o token suelto). Solo admin/validator. La transición
 * sold→used es atómica (RPC con FOR UPDATE) y TODO intento queda
 * registrado en ticket_validations.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["validator", "admin"]);
  if (!guard.ok) return guard.response;
  const { caller } = guard;

  const body = await readJson(request);
  const parsed = validateScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();
  const source = parsed.data.source ?? "scanner";
  const token = parseScannedQr(parsed.data.scannedValue);

  if (!token) {
    // Sin token reconocible: registrar el intento y responder invalid.
    await logUnreadableScan(admin, caller.id, {
      source,
      scanned: parsed.data.scannedValue.slice(0, 120),
    });
    return NextResponse.json({
      status: "invalid",
      message: "QR inválido o no registrado.",
    });
  }

  try {
    const result = await runTicketValidation(admin, {
      qrHash: hashQrToken(token),
      validatorId: caller.id,
      metadata: { source },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
