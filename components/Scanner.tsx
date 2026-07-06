"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { ActionButton } from "./ActionButton";
import { StatusBadge, type TicketStatus as BadgeStatus } from "./StatusBadge";
import { AlertIcon, CameraIcon, CheckIcon, QrIcon, XIcon } from "./icons";
import { formatCurrency, getFlagColor } from "@/lib/event";
import type {
  ScanApiResponse,
  ScanStatus,
} from "@/lib/tickets/parse-scanned-qr";

/**
 * Escáner QR real (fase 4). Lee el QR de la entrada con la cámara
 * (@zxing/browser), envía el contenido a `POST /api/tickets/validate`
 * y muestra el resultado. Tras detectar un QR el escaneo se pausa
 * hasta pulsar "Escanear siguiente" (no valida en bucle). Incluye
 * validación manual por código corto y el historial de la sesión.
 */

type CameraState = "idle" | "starting" | "scanning" | "paused";

/** Resultado mostrado: los de la API + error de red/servidor. */
type ResultStatus = ScanStatus | "error";

interface ScanResult extends Omit<ScanApiResponse, "status"> {
  status: ResultStatus;
}

interface HistoryEntry {
  id: number;
  time: string;
  code: string;
  customer: string;
  status: ResultStatus;
}

const RESULT_UI: Record<
  ResultStatus,
  { title: string; tone: string; badge: BadgeStatus; icon: ReactNode }
> = {
  valid: {
    title: "Entrada válida",
    tone: "#2fd35a",
    badge: "valid",
    icon: <CheckIcon size={26} />,
  },
  already_used: {
    title: "Entrada ya usada",
    tone: "#f5b800",
    badge: "used",
    icon: <AlertIcon size={24} />,
  },
  cancelled: {
    title: "Entrada anulada",
    tone: "#e11d2e",
    badge: "void",
    icon: <XIcon size={26} />,
  },
  invalid: {
    title: "QR inválido",
    tone: "#e11d2e",
    badge: "invalid",
    icon: <XIcon size={26} />,
  },
  error: {
    title: "Error de validación",
    tone: "#6c6c7d",
    badge: "invalid",
    icon: <AlertIcon size={24} />,
  },
};

/** `YYYY-MM-DD` → `dd/mm/yyyy` sin desfases de zona horaria. */
function formatDateOnly(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** Timestamp → fecha y hora locales de Ecuador. */
function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibración no disponible: es opcional.
    }
  }
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Para usar el escáner, permite el acceso a la cámara.";
  }
  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    name === "NotReadableError"
  ) {
    return "No se encontró una cámara disponible.";
  }
  return "No se pudo iniciar la cámara. Revisa los permisos del navegador.";
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);
  const historyIdRef = useRef(0);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("auto");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [manualCode, setManualCode] = useState("");

  // Apagar la cámara al salir de la pantalla.
  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function stopCamera(nextState: CameraState = "idle") {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState(nextState);
  }

  async function startScanner(id: string = deviceId) {
    stopCamera("starting");
    setCameraError(null);
    setResult(null);
    detectedRef.current = false;

    const video = videoRef.current;
    if (!video) return;

    try {
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
      });
      const onDecode = (res: { getText(): string } | undefined) => {
        if (!res || detectedRef.current) return;
        detectedRef.current = true;
        handleDetected(res.getText());
      };

      // Cámara trasera por defecto; una concreta si el usuario la eligió.
      controlsRef.current =
        id !== "auto"
          ? await reader.decodeFromVideoDevice(id, video, onDecode)
          : await reader.decodeFromConstraints(
              { audio: false, video: { facingMode: { ideal: "environment" } } },
              video,
              onDecode,
            );
      setCameraState("scanning");

      // Con el permiso concedido ya hay labels: poblar el selector.
      try {
        setDevices(await BrowserQRCodeReader.listVideoInputDevices());
      } catch {
        // Sin enumeración de dispositivos seguimos con la cámara actual.
      }
    } catch (err) {
      setCameraState("idle");
      setCameraError(cameraErrorMessage(err));
    }
  }

  function pushHistory(status: ResultStatus, res?: ScanApiResponse) {
    historyIdRef.current += 1;
    const entry: HistoryEntry = {
      id: historyIdRef.current,
      time: new Date().toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      code: res?.ticket?.short_code ?? "—",
      customer: res?.ticket?.customer_name ?? "—",
      status,
    };
    setHistory((h) => [entry, ...h].slice(0, 12));
  }

  async function submitValidation(endpoint: string, payload: unknown) {
    setValidating(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | (ScanApiResponse & { error?: string })
        | null;

      if (!res.ok || !data?.status) {
        const outcome: ScanResult = {
          status: "error",
          message: data?.error ?? "No se pudo validar. Inténtalo de nuevo.",
        };
        setResult(outcome);
        pushHistory("error");
        vibrate([90, 70, 90]);
        return;
      }

      setResult(data);
      pushHistory(data.status, data);
      vibrate(data.status === "valid" ? 80 : [90, 70, 90]);
    } catch {
      setResult({ status: "error", message: "Error de red. Inténtalo de nuevo." });
      pushHistory("error");
      vibrate([90, 70, 90]);
    } finally {
      setValidating(false);
    }
  }

  async function handleDetected(text: string) {
    // Pausar el escaneo: un QR detectado no debe validarse en bucle.
    stopCamera("paused");
    vibrate(30);
    await submitValidation("/api/tickets/validate", { scannedValue: text });
  }

  async function handleManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (validating || !manualCode.trim()) return;
    stopCamera("paused");
    await submitValidation("/api/tickets/validate-code", { code: manualCode });
    setManualCode("");
  }

  function handleDeviceChange(id: string) {
    setDeviceId(id);
    if (cameraState === "scanning" || cameraState === "starting") {
      void startScanner(id);
    }
  }

  const scanning = cameraState === "scanning";
  const starting = cameraState === "starting";

  const statusLabel = validating
    ? "Validando…"
    : starting
      ? "Iniciando cámara…"
      : scanning
        ? "Escaneando…"
        : cameraState === "paused"
          ? "QR detectado"
          : "Cámara lista";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Área de cámara */}
      <div className="flex flex-col gap-4">
        <div className="glass-card overflow-hidden p-4 sm:p-5">
          <div
            className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black"
            style={{
              backgroundImage:
                "radial-gradient(120% 120% at 50% 0%, rgba(208,0,111,0.12), transparent 60%)",
            }}
          >
            {/* Vídeo de la cámara */}
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                scanning || starting ? "opacity-100" : "opacity-0"
              }`}
              muted
              playsInline
            />

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

            {/* Estado central (solo con la cámara apagada) */}
            {!scanning && !starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-black/40 text-muted-2 backdrop-blur-sm">
                  {validating ? <QrIcon size={30} /> : <CameraIcon size={30} />}
                </span>
                <p className="font-condensed text-sm uppercase tracking-wider text-muted">
                  {statusLabel}
                </p>
                {cameraError && (
                  <p className="text-xs leading-relaxed text-flag-red-glow">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Estado bajo el vídeo mientras escanea */}
          {(scanning || starting) && (
            <p className="mt-3 text-center font-condensed text-xs uppercase tracking-wider text-muted">
              {statusLabel}
            </p>
          )}

          {/* Selector de cámara */}
          {devices.length > 1 && (
            <label className="mx-auto mt-4 flex w-full max-w-sm flex-col gap-1.5">
              <span className="font-condensed text-xs uppercase tracking-wider text-muted">
                Cámara
              </span>
              <select
                value={deviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
              >
                <option value="auto">Automática (trasera)</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mx-auto mt-4 flex max-w-sm gap-3">
            {scanning || starting ? (
              <ActionButton
                onClick={() => stopCamera("idle")}
                size="lg"
                fullWidth
                variant="surface"
                icon={<XIcon size={18} />}
              >
                Detener escáner
              </ActionButton>
            ) : (
              <ActionButton
                onClick={() => startScanner()}
                size="lg"
                fullWidth
                disabled={validating}
                icon={<CameraIcon size={18} />}
              >
                {cameraState === "paused" || result
                  ? "Escanear siguiente"
                  : "Iniciar escáner"}
              </ActionButton>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-2">
            Apunta al código QR de la entrada. Tras cada lectura, pulsa
            &ldquo;Escanear siguiente&rdquo;.
          </p>
        </div>

        {/* Validación manual por código */}
        <div className="glass-card p-5">
          <p className="mb-3 font-condensed text-xs uppercase tracking-wider text-muted">
            Validar por código
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="FF-0001"
              disabled={validating}
              className="h-11 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-2 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
            />
            <ActionButton
              type="submit"
              variant="surface"
              disabled={validating || !manualCode.trim()}
            >
              Validar
            </ActionButton>
          </form>
          <p className="mt-2 text-xs text-muted-2">
            Si el QR no se puede leer, escribe el código corto de la entrada.
          </p>
        </div>
      </div>

      {/* Panel de resultado + historial */}
      <div className="flex flex-col gap-4">
        <ResultPanel result={result} validating={validating} />
        <HistoryList entries={history} />
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  validating,
}: {
  result: ScanResult | null;
  validating: boolean;
}) {
  if (validating || !result) {
    return (
      <div className="glass-card flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <span
          className={`grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 ${
            validating ? "animate-glow-pulse text-accent-glow" : "text-muted-2"
          }`}
        >
          <QrIcon size={26} />
        </span>
        <p className="font-condensed text-lg font-semibold uppercase tracking-wide text-foreground">
          {validating ? "Validando…" : "Sin resultado"}
        </p>
        <p className="max-w-xs text-sm text-muted">
          {validating
            ? "Comprobando la entrada en el servidor."
            : "Escanea un QR o valida por código. El resultado aparecerá aquí."}
        </p>
      </div>
    );
  }

  const ui = RESULT_UI[result.status];
  const ticket = result.ticket;
  const color = ticket ? getFlagColor(ticket.selected_color) : null;

  const subMessage =
    result.status === "valid"
      ? "Ingreso autorizado"
      : result.status === "already_used" && ticket?.used_at
        ? `Usada el ${formatDateTime(ticket.used_at)}${
            ticket.validated_by_name ? ` · por ${ticket.validated_by_name}` : ""
          }`
        : result.status === "cancelled" && ticket?.cancellation_reason
          ? `Motivo: ${ticket.cancellation_reason}`
          : result.status === "invalid"
            ? "No se encontró una entrada asociada a este código"
            : result.message;

  return (
    <div
      className="glass-card animate-fade-up flex-1 overflow-hidden p-6"
      style={{
        boxShadow: `0 0 0 1px ${ui.tone}44, 0 20px 50px -30px ${ui.tone}`,
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
          style={{ background: ui.tone, boxShadow: `0 0 20px ${ui.tone}aa` }}
        >
          {ui.icon}
        </span>
        <div className="min-w-0">
          <h3
            className="font-display text-2xl uppercase leading-none tracking-wide"
            style={{ color: ui.tone }}
          >
            {ui.title}
          </h3>
          <p className="mt-1 text-sm text-muted">{subMessage}</p>
        </div>
      </div>

      {ticket && (
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <Row
            label="Código"
            value={ticket.short_code ?? `N.º ${ticket.ticket_number}`}
          />
          <Row label="Asistente" value={ticket.customer_name} />
          {color && (
            <Row
              label="Color"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: color.hex,
                      boxShadow: `0 0 8px ${color.hex}`,
                    }}
                  />
                  {color.label} · {color.status}
                </span>
              }
            />
          )}
          <Row label="Estado" value={<StatusBadge status={ui.badge} />} />
          {ticket.event && (
            <>
              <Row label="Evento" value={ticket.event.name} />
              <Row label="Lugar" value={ticket.event.location ?? "—"} />
              <Row
                label="Fecha"
                value={formatDateOnly(ticket.event.event_date)}
              />
            </>
          )}
          <Row label="Fase" value={ticket.phase_name ?? "—"} />
          <Row label="Precio" value={formatCurrency(Number(ticket.price))} />
          <Row
            label="Vendedor"
            value={
              ticket.seller
                ? `${ticket.seller.full_name}${
                    ticket.seller.username ? ` (@${ticket.seller.username})` : ""
                  }`
                : "—"
            }
          />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="font-condensed text-[0.65rem] uppercase tracking-wider text-muted-2">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div className="glass-card p-5">
      <p className="mb-3 font-condensed text-xs uppercase tracking-wider text-muted">
        Escaneos de esta sesión
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-2">
          Aún no hay escaneos. Los resultados de esta sesión aparecerán aquí.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2 text-xs"
            >
              <span className="shrink-0 tabular-nums text-muted-2">
                {e.time}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">
                <span className="font-medium">{e.code}</span>
                {e.customer !== "—" && (
                  <span className="text-muted"> · {e.customer}</span>
                )}
              </span>
              <StatusBadge status={RESULT_UI[e.status].badge} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
