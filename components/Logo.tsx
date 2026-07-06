import { HeartIcon } from "./icons";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { flags: string; fest: string; heart: number; gap: string }> = {
  sm: { flags: "text-2xl", fest: "text-[0.6rem]", heart: 12, gap: "gap-0.5" },
  md: { flags: "text-4xl", fest: "text-xs", heart: 18, gap: "gap-1" },
  lg: { flags: "text-6xl", fest: "text-sm", heart: 26, gap: "gap-1.5" },
  xl: { flags: "text-7xl sm:text-8xl", fest: "text-base", heart: 34, gap: "gap-2" },
};

/**
 * Wordmark de FLAGS FEST inspirado en las referencias:
 * "FLAGS" en display pesado con un corazón sustituyendo parte
 * de la "A", y "FEST" debajo flanqueado por guiones.
 */
export function Logo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex flex-col items-center ${s.gap} ${className}`}>
      <span
        className={`font-display leading-none tracking-[0.02em] text-foreground ${s.flags} flex items-baseline`}
        style={{ textShadow: "0 0 22px rgba(255,255,255,0.25)" }}
      >
        FL
        <HeartIcon
          size={s.heart}
          className="mx-[0.02em] -translate-y-[0.06em] text-flag-red-glow drop-shadow-[0_0_8px_rgba(255,45,64,0.7)]"
        />
        GS
      </span>
      <span
        className={`font-condensed track-wider font-semibold text-muted ${s.fest} flex items-center gap-2`}
      >
        <span className="h-px w-4 bg-muted-2" />
        FEST
        <span className="h-px w-4 bg-muted-2" />
      </span>
    </span>
  );
}
