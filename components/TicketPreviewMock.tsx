import { EVENT, getFlagColor, type FlagColorId } from "@/lib/event";
import { HeartIcon } from "./icons";
import { Logo } from "./Logo";
import { QrMock } from "./QrMock";

export interface TicketData {
  customerName: string;
  color: FlagColorId;
  ticketNumber: string;
  date?: string;
  venue?: string;
}

/**
 * Maqueta visual de la entrada, inspirada en
 * /public/branding/formato-entrada.png.
 *
 * Formato de talón horizontal tintado según el color bandera
 * elegido, con muescas de perforación en los extremos, logo
 * central, estado del color en cursiva, datos del cliente y QR.
 * Es sólo presentación — la generación real de PDF llega en fase 2.
 */
export function TicketPreviewMock({
  data,
  className = "",
}: {
  data: TicketData;
  className?: string;
}) {
  const color = getFlagColor(data.color);
  const date = data.date ?? EVENT.date;
  const venue = data.venue ?? EVENT.venue;

  const tint = color.hex;

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${tint}66`,
          background: `linear-gradient(120deg, ${tint}26 0%, rgba(6,6,10,0.96) 45%, rgba(6,6,10,0.98) 100%)`,
          boxShadow: `0 0 0 1px ${tint}22, 0 24px 60px -30px ${tint}88, 0 20px 50px -30px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Muescas de perforación (talón) */}
        <span
          className="absolute -left-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-background sm:block"
          aria-hidden
        />
        <span
          className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-background sm:block"
          aria-hidden
        />

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto]">
          {/* Talón izquierdo: FLAGS FEST vertical + número */}
          <div
            className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3 sm:flex-col sm:border-b-0 sm:border-r sm:py-5"
            style={{ borderColor: `${tint}33`, background: `${tint}1f` }}
          >
            <span className="font-display text-lg leading-none text-white sm:[writing-mode:vertical-rl] sm:rotate-180">
              FLAGS<span className="mx-1 opacity-60">·</span>FEST
            </span>
            <span className="font-condensed text-xs uppercase tracking-wider text-white/70">
              N.º {data.ticketNumber}
            </span>
          </div>

          {/* Centro: logo, estado del color y datos del cliente */}
          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Logo size="md" />
              <div className="text-right">
                <p
                  className="font-condensed text-lg font-bold uppercase leading-none tracking-wide"
                  style={{ color: tint, textShadow: `0 0 12px ${tint}aa` }}
                >
                  {color.label}
                </p>
                <p
                  className="font-script text-2xl leading-none"
                  style={{ color: tint }}
                >
                  {color.status}
                </p>
              </div>
            </div>

            <p className="font-condensed text-[0.7rem] uppercase tracking-wider text-muted">
              {EVENT.tagline}
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
              <Field label="Asistente" value={data.customerName} wide />
              <Field label="Fecha" value={date} />
              <Field label="Lugar" value={venue} />
              <Field
                label="Color"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: tint, boxShadow: `0 0 8px ${tint}` }}
                    />
                    {color.label}
                  </span>
                }
              />
              <Field label="Entrada" value={`N.º ${data.ticketNumber}`} />
            </div>

            <p
              className="flex items-center gap-1.5 font-condensed text-[0.7rem] uppercase tracking-wider"
              style={{ color: tint }}
            >
              <HeartIcon size={12} /> Elige tu color, vive la noche.
            </p>
          </div>

          {/* Derecha: QR + PARADOX + leyendas */}
          <div
            className="flex flex-col items-center justify-center gap-3 border-t px-5 py-5 sm:border-l sm:border-t-0"
            style={{ borderColor: `${tint}33` }}
          >
            <div
              className="rounded-xl bg-white p-2"
              style={{ boxShadow: `0 0 22px ${tint}88` }}
            >
              <QrMock value={`FLAGSFEST-${data.ticketNumber}-${data.color}`} size={116} />
            </div>
            <p
              className="font-condensed text-sm font-semibold uppercase tracking-[0.35em]"
              style={{ color: tint }}
            >
              Paradox
            </p>
            <div className="text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/85">
                Entrada única e intransferible
              </p>
              <p className="mt-0.5 text-[0.55rem] uppercase tracking-wide text-muted-2">
                Presentar este código QR el día del evento
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="font-condensed text-[0.6rem] uppercase tracking-wider text-muted-2">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
