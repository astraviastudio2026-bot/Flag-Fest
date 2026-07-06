import type { ReactNode } from "react";

/** Contenedor de sección genérico para dashboards. */
export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`glass-card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-condensed text-lg font-semibold uppercase tracking-wide text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
