/**
 * Usuarios internos de Flag-Fest.
 *
 * No usamos correos reales para el personal del sistema. Supabase Auth
 * exige formato de email, así que trabajamos con correos ficticios bajo
 * un dominio local. El personal inicia sesión con su "usuario interno"
 * (p. ej. `vendedor1`) y el sistema lo completa a `vendedor1@flagfest.local`.
 */

/** Dominio local para los correos internos ficticios. */
export const INTERNAL_EMAIL_DOMAIN = "flagfest.local";

/**
 * Normaliza un usuario interno o correo a un email válido.
 *
 * Reglas:
 * - Si el input contiene `@`, se respeta tal cual (en minúsculas).
 * - Si no contiene `@`, se pasa a minúsculas, se quitan espacios y se
 *   añade `@flagfest.local`.
 *
 * Ejemplos:
 *   admin      -> admin@flagfest.local
 *   vendedor1  -> vendedor1@flagfest.local
 *   validador  -> validador@flagfest.local
 */
export function normalizeInternalEmail(input: string): string {
  const value = input.trim().toLowerCase();
  if (value.includes("@")) return value;
  return `${value.replace(/\s+/g, "")}@${INTERNAL_EMAIL_DOMAIN}`;
}

/** Deriva el usuario interno (parte local) a partir de un correo. */
export function internalUsernameFromEmail(email: string): string {
  return email.trim().toLowerCase().split("@")[0] ?? "";
}

/** Usuario interno a mostrar a partir de un input de formulario. */
export function internalUsername(input: string): string {
  return internalUsernameFromEmail(normalizeInternalEmail(input));
}
