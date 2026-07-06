import { ActionButton } from "@/components/ActionButton";
import { EventCard } from "@/components/EventCard";
import { ArrowRightIcon, QrIcon } from "@/components/icons";
import { EVENT } from "@/lib/event";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="grid w-full items-center gap-10 lg:grid-cols-2">
        {/* Presentación */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 font-condensed text-xs uppercase tracking-wider text-muted">
            <QrIcon size={14} className="text-accent-glow" />
            Venta y validación QR de entradas
          </span>

          <h1 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide text-foreground sm:text-6xl">
            Vive la noche
            <br />
            <span className="neon-text-accent">Elige tu color</span>
          </h1>

          <p className="mt-5 max-w-md text-muted">
            Plataforma interna de <strong className="text-foreground">Flags Fest</strong> para
            gestionar la venta, generar entradas y validar el acceso con código
            QR el día del evento.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ActionButton
              href="/login"
              size="lg"
              icon={<ArrowRightIcon size={18} />}
            >
              Ingresar al sistema
            </ActionButton>
            <ActionButton href="/scanner" size="lg" variant="surface">
              Abrir escáner
            </ActionButton>
          </div>

          <p className="mt-6 font-condensed text-xs uppercase tracking-wider text-muted-2">
            {EVENT.date} · {EVENT.venue} · {EVENT.subtitle}
          </p>
        </div>

        {/* Tarjeta del evento */}
        <div className="animate-fade-up">
          <EventCard />
        </div>
      </div>
    </main>
  );
}
