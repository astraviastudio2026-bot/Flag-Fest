import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { LogOutIcon } from "./icons";

export interface HeaderUser {
  full_name: string;
  username: string | null;
  role: UserRole;
}

/** Cabecera de página dentro del AppShell. */
export function Header({
  title,
  subtitle,
  badge,
  actions,
  user,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  user?: HeaderUser;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl leading-none tracking-wide text-foreground sm:text-4xl">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">
              {user.full_name}
            </p>
            <p className="font-condensed text-[0.7rem] uppercase tracking-wider text-muted-2">
              {user.username ? `@${user.username} · ` : ""}
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
        {actions}
        {/* Cierre de sesión real vía Supabase Auth */}
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3.5 font-condensed text-sm font-semibold uppercase tracking-wide text-muted transition-all duration-200 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LogOutIcon size={16} />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </header>
  );
}
