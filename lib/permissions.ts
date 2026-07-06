/**
 * Lógica de permisos y acceso por rol (sin dependencias de framework).
 */

import type { UserRole } from "./types";
import { ROLE_HOME, ROUTE_ACCESS } from "./constants";
import type { Role as NavRole } from "./nav";

/** Ruta de inicio del rol tras autenticarse. */
export function roleHome(role: UserRole): string {
  return ROLE_HOME[role];
}

/**
 * Indica si un rol puede acceder a una ruta protegida.
 * Las rutas no listadas en ROUTE_ACCESS se consideran accesibles
 * (p. ej. rutas públicas o utilitarias ya filtradas antes).
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const match = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!match) return true;
  return match.roles.includes(role);
}

/** Devuelve la regla de acceso aplicable a una ruta, si la hay. */
export function routeRuleFor(pathname: string): UserRole[] | null {
  const match = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match ? match.roles : null;
}

/**
 * Mapea el rol de base de datos al rol de navegación del AppShell.
 * El validador comparte la interfaz del escáner.
 */
export function navRoleForDbRole(role: UserRole): NavRole {
  switch (role) {
    case "admin":
      return "admin";
    case "seller":
      return "seller";
    case "validator":
      return "scanner";
  }
}
