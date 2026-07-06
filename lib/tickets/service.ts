import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event, Ticket } from "@/lib/types";
import { getFlagColor } from "@/lib/event";
import { generateQrDataUrl } from "./qr";
import { renderTicketPdf, type TicketPdfData } from "./pdf";
import { downloadTicketPdf, uploadTicketPdf } from "./storage";
import { sendTicketEmail, type SendTicketEmailResult } from "@/lib/email/resend";

/**
 * Orquestación de la entrada: QR → PDF → Storage → correo.
 * SOLO SERVIDOR. Recibe un cliente `admin` (service_role) para tocar
 * Storage y actualizar el seguimiento del correo saltando RLS.
 */

export interface TicketContext {
  ticket: Ticket;
  event: Event;
  phaseName: string;
}

/**
 * Carga una entrada con su evento y el nombre de la fase (para reenvío y
 * descarga). Devuelve null si la entrada o el evento no existen.
 */
export async function loadTicketContext(
  admin: SupabaseClient,
  ticketId: string,
): Promise<TicketContext | null> {
  const { data: ticket } = await admin
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle<Ticket>();
  if (!ticket) return null;

  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", ticket.event_id)
    .maybeSingle<Event>();
  if (!event) return null;

  let phaseName = "—";
  if (ticket.sale_phase_id) {
    const { data: phase } = await admin
      .from("sale_phases")
      .select("name")
      .eq("id", ticket.sale_phase_id)
      .maybeSingle<{ name: string }>();
    if (phase?.name) phaseName = phase.name;
  }

  return { ticket, event, phaseName };
}

/** Número de entrada con cero-relleno (4 dígitos). */
export function padTicketNumber(n: number): string {
  return String(n).padStart(4, "0");
}

/** `YYYY-MM-DD` (o timestamp) → `dd/mm/yyyy`, sin desfases de zona. */
export function formatEventDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(Number(price) || 0);
}

/** Construye los datos del PDF (genera el QR a partir del token). */
export async function buildTicketPdfData(
  ticket: Ticket,
  event: Event,
  phaseName: string,
): Promise<TicketPdfData> {
  const qrDataUrl = await generateQrDataUrl(ticket.qr_token);
  return {
    eventName: event.name,
    location: event.location ?? "",
    eventDate: formatEventDate(event.event_date),
    customerName: ticket.customer_name,
    color: ticket.selected_color,
    phaseName,
    price: formatPrice(Number(ticket.price)),
    ticketNumber: padTicketNumber(ticket.ticket_number),
    shortCode: ticket.short_code ?? padTicketNumber(ticket.ticket_number),
    qrDataUrl,
  };
}

/** Renderiza el PDF de la entrada a Buffer. */
export async function generateTicketPdfBuffer(
  ticket: Ticket,
  event: Event,
  phaseName: string,
): Promise<Buffer> {
  const data = await buildTicketPdfData(ticket, event, phaseName);
  return renderTicketPdf(data);
}

/**
 * Devuelve el PDF de la entrada. Si existe en Storage lo descarga; si no,
 * lo regenera, lo sube y actualiza `pdf_storage_path` en la fila.
 */
export async function getOrCreateTicketPdf(
  admin: SupabaseClient,
  ticket: Ticket,
  event: Event,
  phaseName: string,
): Promise<Buffer> {
  if (ticket.pdf_storage_path) {
    const existing = await downloadTicketPdf(admin, ticket.pdf_storage_path);
    if (existing) return existing;
  }

  const buffer = await generateTicketPdfBuffer(ticket, event, phaseName);
  const path = await uploadTicketPdf(admin, ticket.event_id, ticket.id, buffer);
  if (path !== ticket.pdf_storage_path) {
    await admin
      .from("tickets")
      .update({ pdf_storage_path: path })
      .eq("id", ticket.id);
  }
  return buffer;
}

/**
 * Envía el correo con la entrada y actualiza el seguimiento en la fila.
 * No lanza: devuelve el resultado para que el endpoint informe al front.
 */
export async function emailTicket(
  admin: SupabaseClient,
  ticket: Ticket,
  event: Event,
  pdfBuffer: Buffer,
): Promise<SendTicketEmailResult> {
  const result = await sendTicketEmail({
    to: ticket.customer_email,
    customerName: ticket.customer_name,
    eventName: event.name,
    eventDate: formatEventDate(event.event_date),
    location: event.location ?? "—",
    color: getFlagColor(ticket.selected_color).label,
    shortCode: ticket.short_code ?? padTicketNumber(ticket.ticket_number),
    pdfBuffer,
  });

  if (result.ok) {
    await admin
      .from("tickets")
      .update({
        email_sent_at: new Date().toISOString(),
        resend_email_id: result.id,
        email_last_error: null,
      })
      .eq("id", ticket.id);
  } else {
    await admin
      .from("tickets")
      .update({ email_last_error: result.error })
      .eq("id", ticket.id);
  }

  return result;
}
