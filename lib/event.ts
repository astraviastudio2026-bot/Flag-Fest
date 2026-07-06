/**
 * Datos y constantes del evento Flag-Fest.
 *
 * Constantes visuales de la marca (colores de bandera, textos del hero).
 * Los datos operativos del evento (fases, cupos, entradas) viven en
 * Supabase; aquí solo queda lo puramente presentacional.
 */

export const EVENT = {
  name: "FLAGS FEST",
  tagline: "Green Flags & Red Flags Party",
  subtitle: "Rave × Regueton",
  date: "30 de Julio, 2026",
  dateShort: "30·07·26",
  doors: "22:00",
  venue: "Paradox",
  city: "Paradox Club",
  slogan: "Elige tu color. Vive la noche.",
  hook: "Tu próximo crush empieza aquí…",
  totalTickets: 600,
  currency: "USD",
} as const;

/** Los tres "colores bandera" que definen la experiencia del evento. */
export type FlagColorId = "verde" | "rojo" | "amarillo";

export interface FlagColor {
  id: FlagColorId;
  label: string;
  status: string;
  description: string;
  /** clase de token de color para acentos */
  token: "flag-green" | "flag-red" | "flag-yellow";
  hex: string;
}

export const FLAG_COLORS: FlagColor[] = [
  {
    id: "verde",
    label: "Verde",
    status: "Soltero/a",
    description: "Abierto/a a conocer a alguien especial.",
    token: "flag-green",
    hex: "#2fd35a",
  },
  {
    id: "rojo",
    label: "Rojo",
    status: "No busco nada",
    description: "Disfruto la noche, sin etiquetas.",
    token: "flag-red",
    hex: "#e11d2e",
  },
  {
    id: "amarillo",
    label: "Amarillo",
    status: "Depende",
    description: "Todo puede pasar, déjate llevar.",
    token: "flag-yellow",
    hex: "#f5b800",
  },
];

export function getFlagColor(id: FlagColorId): FlagColor {
  return FLAG_COLORS.find((c) => c.id === id) ?? FLAG_COLORS[0];
}

/** Fases de venta con precio escalonado (maqueta). */
export interface SalePhase {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export const SALE_PHASES: SalePhase[] = [
  { id: "preventa", name: "Preventa", price: 8, active: false },
  { id: "fase-1", name: "Fase 1", price: 12, active: true },
  { id: "fase-2", name: "Fase 2", price: 15, active: false },
  { id: "puerta", name: "En puerta", price: 20, active: false },
];

export function activePhase(): SalePhase {
  return SALE_PHASES.find((p) => p.active) ?? SALE_PHASES[0];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: EVENT.currency,
  }).format(amount);
}

/** Formatea un timestamp ISO como `dd/mm/yyyy` en la zona de Ecuador. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
