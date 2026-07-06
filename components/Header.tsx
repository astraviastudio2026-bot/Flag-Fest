import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";

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
        {/* Cierre de sesión real vía Route Handler (sin Server Actions) */}
        <LogoutButton />
      </div>
    </header>
  );
}
