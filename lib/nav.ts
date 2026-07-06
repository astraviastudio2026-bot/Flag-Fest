/** Definición de navegación por rol para el AppShell. */

export type Role = "admin" | "seller" | "scanner";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // emoji ligero como placeholder de icono
}

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Panel", icon: "◉" },
    { href: "/seller", label: "Vendedores", icon: "◈" },
    { href: "/scanner", label: "Escáner", icon: "▣" },
  ],
  seller: [
    { href: "/seller", label: "Vender", icon: "◈" },
    { href: "/scanner", label: "Escáner", icon: "▣" },
  ],
  scanner: [{ href: "/scanner", label: "Escáner", icon: "▣" }],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  seller: "Vendedor",
  scanner: "Control de acceso",
};
