/**
 * Constantes transversales de Flag-Fest.
 */

import type { UserRole, TicketColor } from "./types";

/** Ruta de inicio de cada rol tras iniciar sesión. */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  seller: "/seller",
  validator: "/scanner",
};

/** Etiqueta legible de cada rol. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  seller: "Vendedor",
  validator: "Control de acceso",
};

/**
 * Reglas de acceso por prefijo de ruta protegida.
 * Cada prefijo indica qué roles pueden entrar.
 */
export const ROUTE_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/seller", roles: ["seller", "admin"] },
  { prefix: "/scanner", roles: ["validator", "admin"] },
];

/** Prefijos que requieren autenticación. */
export const PROTECTED_PREFIXES = ROUTE_ACCESS.map((r) => r.prefix);

/** Rutas públicas (accesibles sin sesión). */
export const PUBLIC_ROUTES = ["/", "/login"];

/** Colores bandera válidos para una entrada. */
export const TICKET_COLORS: TicketColor[] = ["verde", "rojo", "amarillo"];

/** Total de entradas por defecto de un evento. */
export const DEFAULT_TOTAL_TICKETS = 600;
