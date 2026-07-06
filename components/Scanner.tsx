"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "./ActionButton";
import { StatusBadge, type TicketStatus } from "./StatusBadge";
import {
  AlertIcon,
  CameraIcon,
  CheckIcon,
  QrIcon,
  XIcon,
} from "./icons";
import { getFlagColor, type FlagColorId } from "@/lib/event";

type ScanState = "idle" | "scanning" | "valid" | "used" | "void" | "invalid";

interface DemoResult {
  state: Exclude<ScanState, "idle" | "scanning">;
  status: TicketStatus;
  title: string;
  message: string;
  name?: string;
  color?: FlagColorId;
  ticket?: string;
  tone: string;
}

// Secuencia de resultados de demostración (cicla en cada escaneo).
const DEMO: DemoResult[] = [
  {
    state: "valid",
    status: "valid",
    title: "Entrada válida",
    message: "Acceso permitido. ¡Bienvenido/a!",
    name: "María Fernández",
    color: "verde",
    ticket: "0148",
    tone: "#2fd35a",
  },
  {
    state: "used",
    status: "used",
    title: "Entrada ya usada",
    message: "Este código ya fue validado a las 22:41.",
    name: "Carlos Ruiz",
    color: "amarillo",
    ticket: "0092",
    tone: "#f5b800",
  },
  {
    state: "void",
    status: "void",
    title: "Entrada anulada",
    message: "Entrada cancelada por el administrador.",
    name: "Ana López",
    color: "rojo",
    ticket: "0033",
    tone: "#e11d2e",
  },
  {
    state: "invalid",
    status: "invalid",
    title: "QR inválido",
    message: "El código no corresponde a Flags Fest.",
    tone: "#6c6c7d",
  },
];

const ICONS = {
  valid: <CheckIcon size={26} />,
  used: <AlertIcon size={24} />,
  void: <XIcon size={26} />,
  invalid: <XIcon size={26} />,
};

/** Pantalla de escáner QR (maqueta — sin cámara real todavía). */
export function Scanner() {
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [cursor, setCursor] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function startScan() {
    setResult(null);
    setState("scanning");
    timer.current = setTimeout(() => {
      const next = DEMO[cursor % DEMO.length];
      setResult(next);
      setState(next.state);
      setCursor((c) => c + 1);
    }, 1600);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setResult(null);
    setState("idle");
  }

  const scanning = state === "scanning";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Área de cámara */}
      <div className="glass-card overflow-hidden p-4 sm:p-5">
        <div
          className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black"
          style={{
            backgroundImage:
              "radial-gradient(120% 120% at 50% 0%, rgba(208,0,111,0.12), transparent 60%)",
          }}
        >
          {/* Retícula */}
          <div className="pointer-events-none absolute inset-6">
            {(
              [
                "left-0 top-0 border-l-2 border-t-2",
                "right-0 top-0 border-r-2 border-t-2",
                "left-0 bottom-0 border-l-2 border-b-2",
                "right-0 bottom-0 border-r-2 border-b-2",
              ] as const
            ).map((c) => (
              <span
                key={c}
                className={`absolute h-8 w-8 rounded-sm border-accent-glow/70 ${c}`}
              />
            ))}
          </div>

          {/* Línea de escaneo */}
          {scanning && (
            <div className="pointer-events-none absolute inset-x-6 top-6 bottom-6 overflow-hidden">
              <div className="animate-scan h-16 w-full bg-[linear-gradient(to_bottom,transparent,rgba(255,47,160,0.55),transparent)]" />
            </div>
          )}

          {/* Estado central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span
              className={`grid h-16 w-16 place-items-center rounded-2xl bg-black/40 backdrop-blur-sm ${
                scanning ? "animate-glow-pulse text-accent-glow" : "text-muted-2"
              }`}
            >
              {scanning ? <QrIcon size={30} /> : <CameraIcon size={30} />}
            </span>
            <p className="font-condensed text-sm uppercase tracking-wider text-muted">
              {scanning
                ? "Escaneando…"
                : state === "idle"
                  ? "Cámara lista"
                  : "Toca reiniciar para otro escaneo"}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-sm gap-3">
          <ActionButton
            onClick={startScan}
            size="lg"
            fullWidth
            disabled={scanning}
            icon={<CameraIcon size={18} />}
          >
            {scanning ? "Escaneando…" : "Iniciar escaneo"}
          </ActionButton>
          {state !== "idle" && !scanning && (
            <ActionButton onClick={reset} size="lg" variant="surface">
              Reiniciar
            </ActionButton>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted-2">
          Vista de demostración · el escáner con cámara real se activará en la
          siguiente fase.
        </p>
      </div>

      {/* Panel de resultado */}
      <div className="flex flex-col gap-4">
        <ResultPanel state={state} result={result} />
        <StatesLegend />
      </div>
    </div>
  );
}

function ResultPanel({
  state,
  result,
}: {
  state: ScanState;
  result: DemoResult | null;
}) {
  if (!result || state === "idle" || state === "scanning") {
    return (
      <div className="glass-card flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted-2">
          <QrIcon size={26} />
        </span>
        <p className="font-condensed text-lg font-semibold uppercase tracking-wide text-foreground">
          Sin resultado
        </p>
        <p className="max-w-xs text-sm text-muted">
          Inicia un escaneo para validar una entrada. El resultado aparecerá
          aquí.
        </p>
      </div>
    );
  }

  const c = result.color ? getFlagColor(result.color) : null;

  return (
    <div
      className="glass-card animate-fade-up flex-1 overflow-hidden p-6"
      style={{ boxShadow: `0 0 0 1px ${result.tone}44, 0 20px 50px -30px ${result.tone}` }}
    >
      <div className="flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
          style={{ background: result.tone, boxShadow: `0 0 20px ${result.tone}aa` }}
        >
          {ICONS[result.state]}
        </span>
        <div className="min-w-0">
          <h3
            className="font-display text-2xl leading-none tracking-wide"
            style={{ color: result.tone }}
          >
            {result.title}
          </h3>
          <p className="mt-1 text-sm text-muted">{result.message}</p>
        </div>
      </div>

      {result.name && (
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <Row label="Asistente" value={result.name} />
          <Row label="Entrada" value={`N.º ${result.ticket}`} />
          {c && (
            <Row
              label="Color"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
                  />
                  {c.label} · {c.status}
                </span>
              }
            />
          )}
          <Row label="Estado" value={<StatusBadge status={result.status} />} />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-condensed text-[0.65rem] uppercase tracking-wider text-muted-2">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatesLegend() {
  const items: { status: TicketStatus; text: string }[] = [
    { status: "valid", text: "Acceso permitido" },
    { status: "used", text: "Ya validada" },
    { status: "void", text: "Cancelada" },
    { status: "invalid", text: "No reconocida" },
  ];
  return (
    <div className="glass-card p-5">
      <p className="mb-3 font-condensed text-xs uppercase tracking-wider text-muted">
        Estados posibles
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((i) => (
          <div key={i.status} className="flex items-center gap-2">
            <StatusBadge status={i.status} />
            <span className="text-xs text-muted-2">{i.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
