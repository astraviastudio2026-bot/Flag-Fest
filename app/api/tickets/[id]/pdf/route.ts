import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadTicketContext,
  getOrCreateTicketPdf,
  padTicketNumber,
} from "@/lib/tickets/service";

export const runtime = "nodejs";

/**
 * GET /api/tickets/[id]/pdf
 *
 * Descarga el PDF de la entrada desde Storage (service role). Admin puede
 * descargar cualquiera; el vendedor solo las suyas. Si no existe, se
 * regenera y se guarda. Devuelve el PDF inline.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/tickets/[id]/pdf">,
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

  const filename = `entrada-${ticket.short_code ?? padTicketNumber(ticket.ticket_number)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
