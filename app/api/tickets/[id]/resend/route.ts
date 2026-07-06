import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadTicketContext,
  getOrCreateTicketPdf,
  emailTicket,
} from "@/lib/tickets/service";

export const runtime = "nodejs";

/**
 * POST /api/tickets/[id]/resend
 *
 * Reenvía el PDF de la entrada al correo del cliente. Admin puede reenviar
 * cualquier entrada; el vendedor solo las suyas. Si el PDF no está en
 * Storage se regenera. Actualiza el seguimiento del correo y audita.
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]/resend">,
) {
  const guard = await requireApiRole(["seller", "admin"]);
  if (!guard.ok) return guard.response;
  const { caller } = guard;

  const { id } = await ctx.params;
  const admin = createAdminClient();

  const context = await loadTicketContext(admin, id);
  if (!context) {
    return NextResponse.json({ error: "Entrada no encontrada." }, { status: 404 });
  }
  const { ticket, event, phaseName } = context;

  if (caller.role !== "admin" && ticket.seller_id !== caller.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await getOrCreateTicketPdf(admin, ticket, event, phaseName);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de PDF.";
    return NextResponse.json(
      { error: `No se pudo preparar el PDF: ${message}` },
      { status: 500 },
    );
  }

  const result = await emailTicket(admin, ticket, event, buffer);

  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    action: "ticket.resend_email",
    entity_type: "ticket",
    entity_id: ticket.id,
    metadata: { short_code: ticket.short_code, email_sent: result.ok },
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: `No se pudo enviar el correo: ${result.error}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    emailSent: true,
    message: "Correo reenviado correctamente.",
  });
}
