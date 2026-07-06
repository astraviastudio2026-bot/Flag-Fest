"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV, ROLE_LABEL, type Role } from "@/lib/nav";
import { Logo } from "./Logo";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Marco de aplicación para las vistas autenticadas: barra lateral
 * en escritorio y navegación inferior en móvil, coherentes con la
 * identidad del evento.
 */
export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-3 border-b border-border px-6 py-6">
          <Logo size="sm" />
        </div>
        <div className="px-4 py-3">
          <p className="px-2 font-condensed text-[0.65rem] uppercase tracking-wider text-muted-2">
            {ROLE_LABEL[role]}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-condensed text-sm font-medium uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-[linear-gradient(120deg,rgba(225,29,46,0.18),rgba(208,0,111,0.18))] text-foreground ring-1 ring-accent/30"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <span
                  className={`text-lg ${active ? "neon-text-accent" : "text-muted-2 group-hover:text-foreground"}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-6 py-4">
          <p className="font-condensed text-[0.65rem] uppercase tracking-wider text-muted-2">
            Flags Fest · 2026
          </p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior móvil */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <Logo size="sm" />
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-condensed text-[0.65rem] uppercase tracking-wider text-muted">
            {ROLE_LABEL[role]}
          </span>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 font-condensed text-[0.65rem] uppercase tracking-wide transition-colors ${
                  active ? "neon-text-accent" : "text-muted-2"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
