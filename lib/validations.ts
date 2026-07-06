/**
 * Esquemas de validación (zod) para los formularios importantes.
 */

import { z } from "zod";
import { TICKET_COLORS } from "./constants";

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

export const createPhaseSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre de la fase es obligatorio."),
    phase_order: z.coerce.number().int().min(1, "Orden no válido."),
    starts_at: z.string().min(1, "Fecha de inicio obligatoria."),
    ends_at: z.string().min(1, "Fecha de fin obligatoria."),
    price: z.coerce.number().min(0, "El precio no puede ser negativo."),
  })
  .refine(
    (v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(),
    { message: "La fecha de fin debe ser posterior a la de inicio.", path: ["ends_at"] },
  );
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export const allocationSchema = z.object({
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
