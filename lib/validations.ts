/**
 * Esquemas de validación (zod) para los formularios importantes.
 */

import { z } from "zod";
import { TICKET_COLORS } from "./constants";

export const loginSchema = z.object({
  // Usuario interno ("admin") o correo interno completo
  // ("admin@flagfest.local"). Se normaliza en el servidor.
  identifier: z
    .string({ message: "Introduce tu usuario o correo interno." })
    .trim()
    .min(1, "Introduce tu usuario o correo interno."),
  password: z
    .string({ message: "Introduce tu contraseña." })
    .min(1, "Introduce tu contraseña."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  // Usuario interno: puede ser un identificador simple ("vendedor1") o
  // un correo interno completo. Se normaliza en el servidor.
  username: z
    .string()
    .trim()
    .min(3, "El usuario interno debe tener al menos 3 caracteres.")
    .max(120, "El usuario interno es demasiado largo."),
  password: z
    .string()
    .min(8, "La contraseña temporal debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
  role: z.enum(["admin", "seller", "validator"], {
    message: "Rol no válido.",
  }),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createEventSchema = z.object({
  name: z.string().trim().min(3, "El nombre del evento es obligatorio."),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (YYYY-MM-DD)."),
  total_tickets: z.coerce
    .number()
    .int()
    .min(1, "Debe haber al menos 1 entrada.")
    .max(100000, "Cantidad demasiado alta."),
  is_active: z.coerce.boolean().optional().default(true),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Ecuador (America/Guayaquil) usa UTC-5 todo el año, sin horario de verano.
 * Construir los timestamps con este desfase fijo evita que el día
 * seleccionado se corra al convertir a UTC.
 */
const ECUADOR_UTC_OFFSET = "-05:00";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Extrae la parte `YYYY-MM-DD` de una fecha suelta o de un timestamp. */
function extractDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const head = trimmed.slice(0, 10);
  return DATE_ONLY.test(head) ? head : null;
}

/** `2026-07-07` → inicio del día en Ecuador, en ISO UTC. */
export function phaseStartTimestamp(date: string): string {
  return new Date(`${date}T00:00:00${ECUADOR_UTC_OFFSET}`).toISOString();
}

/** `2026-07-19` → fin del día en Ecuador, en ISO UTC. */
export function phaseEndTimestamp(date: string): string {
  return new Date(`${date}T23:59:59${ECUADOR_UTC_OFFSET}`).toISOString();
}

export const createPhaseSchema = z
  .object({
    event_id: z.string().uuid("Evento no válido."),
    name: z.string().trim().min(2, "El nombre de la fase es obligatorio."),
    phase_order: z.coerce.number().int().min(1, "Orden no válido."),
    // El formulario envía solo fechas (`YYYY-MM-DD`). Se aceptan tanto
    // `start_date`/`end_date` como los alias `starts_at`/`ends_at`.
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    price: z.coerce.number().positive("El precio debe ser mayor que 0."),
    is_active: z.coerce.boolean().optional().default(true),
  })
  .transform((data, ctx) => {
    const start = extractDate(data.start_date ?? data.starts_at);
    const end = extractDate(data.end_date ?? data.ends_at);

    if (!start) {
      ctx.addIssue({ code: "custom", path: ["start_date"], message: "Fecha de inicio obligatoria." });
    }
    if (!end) {
      ctx.addIssue({ code: "custom", path: ["end_date"], message: "Fecha de fin obligatoria." });
    }
    if (start && end && end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "La fecha de fin no puede ser anterior a la de inicio.",
      });
    }
    if (!start || !end) return z.NEVER;

    return {
      event_id: data.event_id,
      name: data.name,
      phase_order: data.phase_order,
      price: data.price,
      is_active: data.is_active,
      starts_at: phaseStartTimestamp(start),
      ends_at: phaseEndTimestamp(end),
    };
  });
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export const allocationSchema = z.object({
  event_id: z.string().uuid("Evento no válido."),
  seller_id: z.string().uuid("Vendedor no válido."),
  allocated_quantity: z.coerce
    .number()
    .int()
    .min(0, "El cupo no puede ser negativo.")
    .max(100000, "Cupo demasiado alto."),
});
export type AllocationInput = z.infer<typeof allocationSchema>;

export const ticketColorSchema = z.enum(
  TICKET_COLORS as [string, ...string[]],
);

/**
 * Datos del cliente para crear una entrada real (fase 3).
 * El precio, la fase y el vendedor los determina el servidor.
 */
export const createTicketSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres.")
    .max(120, "El nombre del cliente es demasiado largo."),
  customer_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Introduce un correo del cliente válido."),
  selected_color: z.enum(["verde", "rojo", "amarillo"], {
    message: "Selecciona un color válido.",
  }),
  notes: z
    .string()
    .trim()
    .max(500, "La observación no puede superar los 500 caracteres.")
    .optional()
    .or(z.literal("")),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** Valor escaneado por el lector QR (fase 4). */
export const validateScanSchema = z.object({
  scannedValue: z
    .string({ message: "Falta el valor escaneado." })
    .trim()
    .min(1, "Falta el valor escaneado.")
    .max(2000, "El valor escaneado es demasiado largo."),
  // Origen del intento, para el rastro en ticket_validations.
  source: z.enum(["scanner", "link"]).optional(),
});
export type ValidateScanInput = z.infer<typeof validateScanSchema>;

/** Código corto escrito a mano para validación manual (fase 4). */
export const validateCodeSchema = z.object({
  code: z
    .string({ message: "Introduce el código de la entrada." })
    .trim()
    .min(1, "Introduce el código de la entrada.")
    .max(20, "El código es demasiado largo."),
});
export type ValidateCodeInput = z.infer<typeof validateCodeSchema>;
