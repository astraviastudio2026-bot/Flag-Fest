import type { ReactNode } from "react";
import { ActionButton } from "./ActionButton";
import { LogOutIcon } from "./icons";

/** Cabecera de página dentro del AppShell. */
export function Header({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
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
      <div className="flex items-center gap-2">
        {actions}
        {/* Cierre de sesión (maqueta — sin lógica todavía) */}
        <ActionButton
          href="/login"
          variant="ghost"
          size="sm"
          icon={<LogOutIcon size={16} />}
        >
          Salir
        </ActionButton>
      </div>
    </header>
  );
}
