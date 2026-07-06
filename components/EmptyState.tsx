import type { ReactNode } from "react";
import { InboxIcon } from "./icons";

/** Estado vacío reutilizable. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center ${className}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted-2">
        {icon ?? <InboxIcon size={26} />}
      </span>
      <h3 className="mt-4 font-condensed text-lg font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
