/**
 * Tipos de dominio de Flag-Fest.
 *
 * Reflejan el esquema de Supabase definido en
 * `supabase/migrations/001_initial_schema.sql`.
 */

/** Rol de usuario en el sistema. */
export type UserRole = "admin" | "seller" | "validator";

/** Estado de una entrada. */
export type TicketStatus = "sold" | "used" | "cancelled";

/** Color bandera elegido por el asistente. */
export type TicketColor = "verde" | "rojo" | "amarillo";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  /** Usuario interno sin dominio (p. ej. "vendedor1"). */
  username: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  location: string | null;
  event_date: string;
  total_tickets: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalePhase {
  id: string;
  event_id: string;
  name: string;
  phase_order: number;
  starts_at: string;
  ends_at: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface SellerAllocation {
  id: string;
  event_id: string;
  seller_id: string;
  allocated_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  seller_id: string;
  sale_phase_id: string | null;
  ticket_number: number;
  qr_token: string;
  qr_hash: string;
  customer_name: string;
  customer_email: string;
  selected_color: TicketColor;
  price: number;
  status: TicketStatus;
  pdf_url: string | null;
  sold_at: string;
  used_at: string | null;
  validated_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketValidation {
  id: string;
  ticket_id: string | null;
  validator_id: string | null;
  result: string;
  message: string;
  scanned_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
