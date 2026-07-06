import type { ReactNode } from "react";

type Accent = "green" | "red" | "yellow" | "accent" | "neutral";

const ACCENTS: Record<Accent, { text: string; ring: string; bar: string }> = {
  green: {
    text: "text-flag-green-glow",
    ring: "ring-flag-green/30",
    bar: "bg-flag-green",
  },
  red: {
    text: "text-flag-red-glow",
    ring: "ring-flag-red/30",
    bar: "bg-flag-red",
  },
  yellow: {
    text: "text-flag-yellow-glow",
    ring: "ring-flag-yellow/30",
    bar: "bg-flag-yellow",
  },
  accent: {
    text: "text-accent-glow",
    ring: "ring-accent/30",
    bar: "bg-accent",
  },
  neutral: {
    text: "text-foreground",
    ring: "ring-border",
    bar: "bg-muted-2",
  },
};

/** Tarjeta de métrica para dashboards. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "neutral",
  progress,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: Accent;
  /** 0–100, dibuja una barra inferior si se define */
  progress?: number;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="glass-card relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-condensed text-xs uppercase tracking-wide text-muted">
          {label}
        </p>
        {icon && (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 ring-1 ${a.ring} ${a.text}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 font-display text-3xl leading-none ${a.text}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-2">{hint}</p>}
      {typeof progress === "number" && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full ${a.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
