import type { ReactNode } from "react";

export type TicketStatus = "valid" | "used" | "void" | "invalid" | "pending";

const STYLES: Record<
  TicketStatus,
  { label: string; className: string; dot: string }
> = {
  valid: {
    label: "Válida",
    className: "text-flag-green-glow bg-flag-green/10 border-flag-green/30",
    dot: "bg-flag-green-glow shadow-[0_0_8px_var(--flag-green-glow)]",
  },
  used: {
    label: "Usada",
    className: "text-flag-yellow-glow bg-flag-yellow/10 border-flag-yellow/30",
    dot: "bg-flag-yellow-glow shadow-[0_0_8px_var(--flag-yellow-glow)]",
  },
  void: {
    label: "Anulada",
    className: "text-flag-red-glow bg-flag-red/10 border-flag-red/30",
    dot: "bg-flag-red-glow shadow-[0_0_8px_var(--flag-red-glow)]",
  },
  invalid: {
    label: "Inválida",
    className: "text-muted bg-surface-3 border-border",
    dot: "bg-muted-2",
  },
  pending: {
    label: "Pendiente",
    className: "text-accent-glow bg-accent/10 border-accent/30",
    dot: "bg-accent-glow shadow-[0_0_8px_var(--accent-glow)]",
  },
};

/** Etiqueta de estado de entrada con punto de color. */
export function StatusBadge({
  status,
  children,
  className = "",
}: {
  status: TicketStatus;
  children?: ReactNode;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${s.className} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {children ?? s.label}
    </span>
  );
}
