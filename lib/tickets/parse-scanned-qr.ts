/**
 * Parseo del contenido escaneado del QR de una entrada.
 *
 * Compartido por el escáner (cliente) y los endpoints (servidor):
 * NO importa "server-only" ni módulos de Node.
 */

/** El qr_token son 32 bytes en hexadecimal (64 caracteres). */
const TOKEN_RE = /^[a-f0-9]{64}$/i;

/**
 * Extrae el qr_token desde el valor escaneado. Acepta:
 * - URL completa:  https://flagfest.astraviastudio.lat/ticket/validate/abc…
 * - Ruta relativa: /ticket/validate/abc…
 * - Solo el token: abc…
 * - Cualquiera de los anteriores con espacios alrededor.
 *
 * Devuelve el token en minúsculas o null si no hay un token válido.
 */
export function parseScannedQr(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const match = raw.match(/\/ticket\/validate\/([A-Za-z0-9]+)/);
  const candidate = (match ? match[1] : raw).trim();

  return TOKEN_RE.test(candidate) ? candidate.toLowerCase() : null;
}

/**
 * Normaliza un código corto escrito a mano ("ff-0001", "FF0001", "1")
 * al formato canónico "FF-0001". Devuelve null si no es reconocible.
 */
export function normalizeShortCode(value: string): string | null {
  const raw = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;

  const match = raw.match(/^(?:FF-?)?(\d{1,8})$/);
  if (!match) return null;

  return `FF-${match[1].padStart(4, "0")}`;
}

/** Estado de negocio devuelto por los endpoints de validación. */
export type ScanStatus = "valid" | "already_used" | "cancelled" | "invalid";

/** Datos de la entrada que devuelve la API al validar. */
export interface ScannedTicket {
  id: string;
  short_code: string | null;
  ticket_number: number;
  customer_name: string;
  customer_email: string;
  selected_color: "verde" | "rojo" | "amarillo";
  price: number;
  status: string;
  used_at: string | null;
  cancellation_reason: string | null;
  phase_name: string | null;
  validated_by_name: string | null;
  event: {
    name: string;
    location: string | null;
    event_date: string;
  } | null;
  seller: {
    full_name: string;
    username: string | null;
  } | null;
}

/** Respuesta JSON de POST /api/tickets/validate y /validate-code. */
export interface ScanApiResponse {
  status: ScanStatus;
  message: string;
  ticket?: ScannedTicket;
}
