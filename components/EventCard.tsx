import { EVENT, FLAG_COLORS } from "@/lib/event";
import { Logo } from "./Logo";

/** Tarjeta de presentación del evento con los tres colores bandera. */
export function EventCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card relative overflow-hidden ${className}`}>
      {/* Resplandor superior */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(208,0,111,0.35),transparent)]" />

      <div className="relative flex flex-col items-center gap-4 px-6 pb-6 pt-8 text-center">
        <span className="rounded-full border border-border bg-surface-2 px-3 py-1 font-condensed text-xs uppercase tracking-wider text-muted">
          {EVENT.date} · {EVENT.venue}
        </span>
        <Logo size="lg" />
        <p className="font-condensed text-sm uppercase tracking-wider text-muted">
          {EVENT.tagline}
        </p>
        <p className="max-w-xs text-sm text-muted-2">
          <span className="neon-text-accent font-script text-lg">
            {EVENT.slogan}
          </span>
          <br />
          {EVENT.hook}
        </p>
      </div>

      {/* Franja de colores bandera */}
      <div className="grid grid-cols-3 border-t border-border">
        {FLAG_COLORS.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-1 border-r border-border px-2 py-4 last:border-r-0"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: c.hex,
                boxShadow: `0 0 10px ${c.hex}`,
              }}
            />
            <span
              className="font-condensed text-xs font-semibold uppercase tracking-wide"
              style={{ color: c.hex }}
            >
              {c.label}
            </span>
            <span className="text-[0.65rem] leading-tight text-muted-2">
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
