import { AlertIcon, CheckIcon } from "@/components/icons";

/** Banner de resultado (éxito/error) para los formularios de admin. */
export function FormMessage({
  ok,
  error,
  message,
}: {
  ok?: boolean;
  error?: string | null;
  message?: string;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-flag-red/30 bg-flag-red/10 px-3.5 py-2.5 text-sm text-flag-red-glow"
      >
        <AlertIcon size={16} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  if (ok && message) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-flag-green/30 bg-flag-green/10 px-3.5 py-2.5 text-sm text-flag-green-glow">
        <CheckIcon size={16} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }
  return null;
}

/** Clases compartidas de campos de formulario (coherentes con la marca). */
export const fieldInput =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25";

export const fieldLabel =
  "font-condensed text-xs uppercase tracking-wider text-muted";
