import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "surface" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(120deg,var(--flag-red),var(--accent))] hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(208,0,111,0.7)]",
  surface:
    "text-foreground bg-surface-2 hover:bg-surface-3 border border-border",
  ghost:
    "text-muted hover:text-foreground hover:bg-surface-2 border border-transparent",
  danger:
    "text-white bg-flag-red/90 hover:bg-flag-red border border-flag-red/50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-14 px-7 text-base gap-2.5 rounded-2xl",
};

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

type ButtonProps = BaseProps & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

type LinkProps = BaseProps & { href: string };

function classes(
  variant: Variant,
  size: Size,
  fullWidth: boolean,
  extra: string,
) {
  return [
    "inline-flex items-center justify-center font-condensed font-semibold tracking-wide uppercase",
    "transition-all duration-200 active:scale-[0.98] focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Botón / enlace de acción reutilizable, coherente con la marca. */
export function ActionButton(props: ButtonProps | LinkProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    icon,
    className = "",
    fullWidth = false,
  } = props;

  const cls = classes(variant, size, fullWidth, className);
  const inner = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }

  const { onClick, type = "button", disabled } = props as ButtonProps;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
