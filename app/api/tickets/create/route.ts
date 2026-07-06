import { NextResponse, type NextRequest } from "next/server";
import { requireApiRole, readJson } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTicketSchema } from "@/lib/validations";
import { createQrCredentials } from "@/lib/tickets/qr";
import {
  generateTicketPdfBuffer,
  emailTicket,
} from "@/lib/tickets/service";
import { uploadTicketPdf } from "@/lib/tickets/storage";
import type { Event, SalePhase, Ticket } from "@/lib/types";

// @react-pdf/renderer y node:crypto requieren el runtime de Node.
export const runtime = "nodejs";

/**
 * POST /api/tickets/create
 *
 * Registra una venta real: valida cupo del vendedor y límite global,
 * detecta la fase vigente, crea la entrada de forma atómica (RPC), genera
 * QR + PDF, lo sube a Storage, envía el correo con Resend y registra el
 * audit log. Solo seller/admin. Toda la escritura ocurre en el servidor.
 */
export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["seller", "admin"]);
  if (!guard.ok) return guard.response;
  const { caller } = guard;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();

  // 1. Evento activo.
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Event>();

  if (!event) {
    return NextResponse.json(
      { error: "No hay evento activo configurado." },
      { status: 409 },
    );
  }

  // 2. Fase vigente según la fecha actual (activa y en rango).
  const nowIso = new Date().toISOString();
  const { data: phase } = await admin
    .from("sale_phases")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("phase_order", { ascending: true })
    .limit(1)
    .maybeSingle<SalePhase>();

  if (!phase) {
    return NextResponse.json(
      { error: "No hay una fase de venta activa para la fecha actual." },
      { status: 409 },
    );
  }

  // 3. Cupo del vendedor. Admin sin asignación => venta administrativa
  //    (solo sujeta al límite global). Seller requiere asignación.
  const { data: allocation } = await admin
    .from("seller_allocations")
    .select("allocated_quantity")
    .eq("event_id", event.id)
    .eq("seller_id", caller.id)
    .maybeSingle<{ allocated_quantity: number }>();

  const sellerAllocation =
    caller.role === "admin"
      ? allocation?.allocated_quantity ?? null
      : allocation?.allocated_quantity ?? 0;

  if (caller.role !== "admin" && !allocation) {
    return NextResponse.json(
      { error: "No tienes entradas disponibles." },
      { status: 409 },
    );
  }

  // 3b. Pre-chequeos amables (la fuente de verdad es la RPC, bajo lock).
  if (sellerAllocation !== null) {
    const { count: sellerSold } = await admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("seller_id", caller.id)
      .neq("status", "cancelled");
    if ((sellerSold ?? 0) >= sellerAllocation) {
      return NextResponse.json(
        { error: "No tienes entradas disponibles." },
        { status: 409 },
      );
    }
  }

  const { count: globalSold } = await admin
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["sold", "used"]);
  if ((globalSold ?? 0) >= event.total_tickets) {
    return NextResponse.json(
      { error: "Ya se vendieron todas las entradas disponibles." },
      { status: 409 },
    );
  }

  // 4. Credenciales de QR (token impredecible + hash con QR_SECRET).
  const qr = createQrCredentials();

  // 5. Creación atómica: numeración + código corto + revalidación de cupos.
  const { data: created, error: rpcError } = await admin
    .rpc("create_ticket", {
      p_event_id: event.id,
      p_seller_id: caller.id,
      p_sale_phase_id: phase.id,
      p_customer_name: parsed.data.customer_name,
      p_customer_email: parsed.data.customer_email,
      p_selected_color: parsed.data.selected_color,
      p_price: phase.price,
      p_qr_token: qr.token,
      p_qr_hash: qr.hash,
      p_notes: parsed.data.notes ?? "",
      p_total_tickets: event.total_tickets,
      p_seller_allocation: sellerAllocation,
    })
    .single<Ticket>();

  if (rpcError || !created) {
    const msg = rpcError?.message ?? "";
    if (msg.includes("GLOBAL_SOLD_OUT")) {
      return NextResponse.json(
        { error: "Ya se vendieron todas las entradas disponibles." },
        { status: 409 },
      );
    }
    if (msg.includes("SELLER_SOLD_OUT")) {
      return NextResponse.json(
        { error: "No tienes entradas disponibles." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `No se pudo crear la entrada: ${msg || "error desconocido"}` },
      { status: 500 },
    );
  }

  const ticket = created;

  // 6. PDF → Storage (si falla, la entrada sigue viva; se regenera luego).
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateTicketPdfBuffer(ticket, event, phase.name);
    const path = await uploadTicketPdf(admin, ticket.event_id, ticket.id, pdfBuffer);
    await admin.from("tickets").update({ pdf_storage_path: path }).eq("id", ticket.id);
    ticket.pdf_storage_path = path;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de PDF.";
    await admin
      .from("tickets")
      .update({ email_last_error: `PDF: ${message}` })
      .eq("id", ticket.id);
  }

  // 7. Correo con Resend (no bloquea la venta si falla).
  let emailOk = false;
  if (pdfBuffer) {
    const result = await emailTicket(admin, ticket, event, pdfBuffer);
    emailOk = result.ok;
  }

  // 8. Audit log.
  await admin.from("audit_logs").insert({
    actor_id: caller.id,
    action: "ticket.create",
    entity_type: "ticket",
    entity_id: ticket.id,
    metadata: {
      short_code: ticket.short_code,
      event_id: event.id,
      color: ticket.selected_color,
      email_sent: emailOk,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      ticket: {
        id: ticket.id,
        short_code: ticket.short_code,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        selected_color: ticket.selected_color,
        price: ticket.price,
        status: ticket.status,
      },
      emailSent: emailOk,
      downloadUrl: `/api/tickets/${ticket.id}/pdf`,
      message: emailOk
        ? "Entrada creada y enviada correctamente."
        : "Entrada creada, pero no se pudo enviar el correo. Puedes reenviarla desde la tabla.",
    },
    { status: 201 },
  );
}
