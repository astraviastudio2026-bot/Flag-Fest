import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Acceso al bucket privado de Storage `tickets`.
 *
 * SOLO SERVIDOR: recibe un cliente Supabase con service_role (salta las
 * políticas de Storage). El PDF vive en `tickets/{event_id}/{ticket_id}.pdf`.
 */

export const TICKETS_BUCKET = "tickets";

/** Ruta canónica del PDF dentro del bucket. */
export function ticketPdfPath(eventId: string, ticketId: string): string {
  return `${eventId}/${ticketId}.pdf`;
}

/**
 * Sube (o reemplaza) el PDF de una entrada. Devuelve la ruta guardada.
 * Lanza si Storage devuelve error.
 */
export async function uploadTicketPdf(
  admin: SupabaseClient,
  eventId: string,
  ticketId: string,
  pdf: Buffer,
): Promise<string> {
  const path = ticketPdfPath(eventId, ticketId);
  const { error } = await admin.storage.from(TICKETS_BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`No se pudo subir el PDF a Storage: ${error.message}`);
  }
  return path;
}

/**
 * Descarga el PDF de una entrada desde Storage. Devuelve el Buffer o null
 * si el objeto no existe.
 */
export async function downloadTicketPdf(
  admin: SupabaseClient,
  path: string,
): Promise<Buffer | null> {
  const { data, error } = await admin.storage
    .from(TICKETS_BUCKET)
    .download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
