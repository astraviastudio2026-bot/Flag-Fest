import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event, Profile, Ticket } from "@/lib/types";
import type {
  ScanApiResponse,
  ScanStatus,
  ScannedTicket,
} from "./parse-scanned-qr";

/**
 * Validación de entrada en puerta (fase 4). SOLO SERVIDOR.
 *
 * Llama al RPC atómico `validate_ticket_scan` (bloquea la fila con
 * FOR UPDATE y registra el intento en ticket_validations) y enriquece
 * la respuesta con los datos de la entrada para mostrarlos en el
 * escáner. Recibe un cliente `admin` (service_role): los endpoints ya
 * verificaron el rol admin/validator del solicitante.
 */

const MESSAGES: Record<ScanStatus, string> = {
  valid: "Entrada válida. Ingreso autorizado.",
  already_used: "Esta entrada ya fue utilizada.",
  cancelled: "Esta entrada fue anulada.",
  invalid: "QR inválido o no registrado.",
};

interface ScanLookup {
  /** Hash SHA-256 del token (búsqueda por QR). */
  qrHash?: string;
  /** Código corto canónico "FF-0001" (validación manual). */
  shortCode?: string;
  validatorId: string;
  metadata: Record<string, unknown>;
}

/**
 * Ejecuta la validación atómica y construye la respuesta de la API.
 * Lanza si el RPC falla (p. ej. migración 004 sin aplicar).
 */
export async function runTicketValidation(
  admin: SupabaseClient,
  lookup: ScanLookup,
): Promise<ScanApiResponse> {
  const { data, error } = await admin.rpc("validate_ticket_scan", {
    p_qr_hash: lookup.qrHash ?? null,
    p_validator_id: lookup.validatorId,
    p_metadata: lookup.metadata,
    p_short_code: lookup.shortCode ?? null,
  });

  if (error) {
    throw new Error(`No se pudo validar la entrada: ${error.message}`);
  }

  const outcome = data as { result: ScanStatus; ticket_id: string | null };
  const status = outcome.result;
  const response: ScanApiResponse = { status, message: MESSAGES[status] };

  if (outcome.ticket_id) {
    const ticket = await loadScannedTicket(admin, outcome.ticket_id);
    if (ticket) response.ticket = ticket;
  }

  return response;
}

/** Carga la entrada validada con evento, vendedor, fase y validador. */
async function loadScannedTicket(
  admin: SupabaseClient,
  ticketId: string,
): Promise<ScannedTicket | null> {
  const { data: ticket } = await admin
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle<Ticket>();
  if (!ticket) return null;

  const [{ data: event }, { data: seller }, phaseName, validatorName] =
    await Promise.all([
      admin
        .from("events")
        .select("name, location, event_date")
        .eq("id", ticket.event_id)
        .maybeSingle<Pick<Event, "name" | "location" | "event_date">>(),
      admin
        .from("profiles")
        .select("full_name, username")
        .eq("id", ticket.seller_id)
        .maybeSingle<Pick<Profile, "full_name" | "username">>(),
      ticket.sale_phase_id
        ? admin
            .from("sale_phases")
            .select("name")
            .eq("id", ticket.sale_phase_id)
            .maybeSingle<{ name: string }>()
            .then(({ data }) => data?.name ?? null)
        : Promise.resolve(null),
      ticket.validated_by
        ? admin
            .from("profiles")
            .select("full_name")
            .eq("id", ticket.validated_by)
            .maybeSingle<{ full_name: string }>()
            .then(({ data }) => data?.full_name ?? null)
        : Promise.resolve(null),
    ]);

  return {
    id: ticket.id,
    short_code: ticket.short_code,
    ticket_number: ticket.ticket_number,
    customer_name: ticket.customer_name,
    customer_email: ticket.customer_email,
    selected_color: ticket.selected_color,
    price: Number(ticket.price),
    status: ticket.status,
    used_at: ticket.used_at,
    cancellation_reason: ticket.cancellation_reason,
    phase_name: phaseName,
    validated_by_name: validatorName,
    event: event ?? null,
    seller: seller ?? null,
  };
}

/**
 * Registra un intento con valor ilegible (sin token parseable), para
 * dejar rastro en ticket_validations aunque no haya ticket asociado.
 */
export async function logUnreadableScan(
  admin: SupabaseClient,
  validatorId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await admin.from("ticket_validations").insert({
    ticket_id: null,
    validator_id: validatorId,
    result: "invalid",
    message: "El código escaneado no tiene un formato de entrada válido.",
    metadata,
  });
}
