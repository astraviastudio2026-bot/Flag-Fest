import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Event,
  Profile,
  SalePhase,
  SellerAllocation,
  Ticket,
} from "@/lib/types";

export interface EventStats {
  total: number;
  sold: number;
  available: number;
  used: number;
  cancelled: number;
  income: number;
}

export interface AllocationWithSeller extends SellerAllocation {
  seller: Pick<Profile, "full_name" | "email"> | null;
  sold: number;
}

/** Evento activo más reciente, o null si no hay ninguno configurado. */
export async function getActiveEvent(): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Event>();
  return data ?? null;
}

/** Métricas agregadas del evento a partir de sus entradas. */
export async function getEventStats(event: Event): Promise<EventStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("status, price")
    .eq("event_id", event.id);

  const rows = (data ?? []) as Pick<Ticket, "status" | "price">[];

  let sold = 0;
  let used = 0;
  let cancelled = 0;
  let income = 0;

  for (const t of rows) {
    if (t.status === "cancelled") {
      cancelled += 1;
      continue;
    }
    // 'sold' y 'used' cuentan como vendidas.
    sold += 1;
    income += Number(t.price) || 0;
    if (t.status === "used") used += 1;
  }

  return {
    total: event.total_tickets,
    sold,
    used,
    cancelled,
    available: Math.max(0, event.total_tickets - sold),
    income,
  };
}

/** Fases de venta del evento, ordenadas. */
export async function getPhases(eventId: string): Promise<SalePhase[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sale_phases")
    .select("*")
    .eq("event_id", eventId)
    .order("phase_order", { ascending: true });
  return (data ?? []) as SalePhase[];
}

/**
 * Selecciona la fase vigente según la fecha actual.
 * Prioriza una fase activa cuyo rango incluya "ahora"; si no hay,
 * devuelve la próxima fase activa por comenzar; si no, null.
 */
export function pickCurrentPhase(phases: SalePhase[]): SalePhase | null {
  const now = Date.now();
  const active = phases.filter((p) => p.is_active);

  const current = active.find(
    (p) =>
      new Date(p.starts_at).getTime() <= now &&
      new Date(p.ends_at).getTime() >= now,
  );
  if (current) return current;

  const upcoming = active
    .filter((p) => new Date(p.starts_at).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  return upcoming[0] ?? active[0] ?? null;
}

/**
 * Fase realmente vendible según la fecha actual: activa y con el rango
 * `starts_at <= now <= ends_at`. A diferencia de `pickCurrentPhase`, NO
 * cae a una fase próxima; devuelve null si no hay ninguna vigente ahora.
 */
export function pickSellablePhase(phases: SalePhase[]): SalePhase | null {
  const now = Date.now();
  return (
    phases.find(
      (p) =>
        p.is_active &&
        new Date(p.starts_at).getTime() <= now &&
        new Date(p.ends_at).getTime() >= now,
    ) ?? null
  );
}

/** Fila de entrada enriquecida con nombre de vendedor y fase (para tablas). */
export interface TicketRow extends Ticket {
  seller_name: string | null;
  phase_name: string | null;
}

async function decorateTickets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tickets: Ticket[],
): Promise<TicketRow[]> {
  if (tickets.length === 0) return [];

  const sellerIds = [...new Set(tickets.map((t) => t.seller_id))];
  const phaseIds = [
    ...new Set(tickets.map((t) => t.sale_phase_id).filter(Boolean)),
  ] as string[];

  const [{ data: sellers }, { data: phases }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", sellerIds),
    phaseIds.length
      ? supabase.from("sale_phases").select("id, name").in("id", phaseIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const sellerById = new Map(
    ((sellers ?? []) as Pick<Profile, "id" | "full_name">[]).map((s) => [
      s.id,
      s.full_name,
    ]),
  );
  const phaseById = new Map(
    ((phases ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  );

  return tickets.map((t) => ({
    ...t,
    seller_name: sellerById.get(t.seller_id) ?? null,
    phase_name: t.sale_phase_id ? phaseById.get(t.sale_phase_id) ?? null : null,
  }));
}

/** Entradas de un vendedor en el evento, enriquecidas (más recientes primero). */
export async function getSellerTickets(
  eventId: string,
  sellerId: string,
): Promise<TicketRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .eq("seller_id", sellerId)
    .order("sold_at", { ascending: false });
  return decorateTickets(supabase, (data ?? []) as Ticket[]);
}

/** Todas las entradas del evento, enriquecidas (para el panel admin). */
export async function getEventTickets(eventId: string): Promise<TicketRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .order("sold_at", { ascending: false });
  return decorateTickets(supabase, (data ?? []) as Ticket[]);
}

/** Usuarios gestionables por el admin (vendedores y validadores). */
export async function getManageableUsers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["seller", "validator"])
    .order("created_at", { ascending: false });
  return (data ?? []) as Profile[];
}

/** Solo los vendedores (para asignación de cupos). */
export async function getSellers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "seller")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  return (data ?? []) as Profile[];
}

/** Asignaciones del evento con nombre de vendedor y vendidas reales. */
export async function getAllocations(
  eventId: string,
): Promise<AllocationWithSeller[]> {
  const supabase = await createClient();

  const [{ data: allocs }, { data: profiles }, { data: tickets }] =
    await Promise.all([
      supabase
        .from("seller_allocations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name, email"),
      supabase
        .from("tickets")
        .select("seller_id, status")
        .eq("event_id", eventId),
    ]);

  const profileById = new Map(
    ((profiles ?? []) as Pick<Profile, "id" | "full_name" | "email">[]).map(
      (p) => [p.id, p],
    ),
  );

  const soldBySeller = new Map<string, number>();
  for (const t of (tickets ?? []) as Pick<Ticket, "seller_id" | "status">[]) {
    if (t.status === "cancelled") continue;
    soldBySeller.set(t.seller_id, (soldBySeller.get(t.seller_id) ?? 0) + 1);
  }

  return ((allocs ?? []) as SellerAllocation[]).map((a) => {
    const p = profileById.get(a.seller_id);
    return {
      ...a,
      seller: p ? { full_name: p.full_name, email: p.email } : null,
      sold: soldBySeller.get(a.seller_id) ?? 0,
    };
  });
}

/** Entradas recientes del evento (para el panel admin). */
export async function getRecentTickets(
  eventId: string,
  limit = 5,
): Promise<(Ticket & { seller: Pick<Profile, "full_name"> | null })[]> {
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .order("sold_at", { ascending: false })
    .limit(limit);

  const list = (tickets ?? []) as Ticket[];
  if (list.length === 0) return [];

  const sellerIds = [...new Set(list.map((t) => t.seller_id))];
  const { data: sellers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", sellerIds);

  const byId = new Map(
    ((sellers ?? []) as Pick<Profile, "id" | "full_name">[]).map((s) => [
      s.id,
      s,
    ]),
  );

  return list.map((t) => ({
    ...t,
    seller: byId.get(t.seller_id) ?? null,
  }));
}

/** Validación reciente enriquecida para el panel admin (fase 4). */
export interface ValidationRow {
  id: string;
  scanned_at: string;
  result: string;
  message: string;
  validator_name: string | null;
  ticket_short_code: string | null;
  ticket_customer: string | null;
}

/** Últimas validaciones de entrada (RLS: solo el admin las ve todas). */
export async function getRecentValidations(limit = 10): Promise<ValidationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_validations")
    .select("id, ticket_id, validator_id, result, message, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as {
    id: string;
    ticket_id: string | null;
    validator_id: string | null;
    result: string;
    message: string;
    scanned_at: string;
  }[];
  if (rows.length === 0) return [];

  const ticketIds = [...new Set(rows.map((r) => r.ticket_id).filter(Boolean))] as string[];
  const validatorIds = [
    ...new Set(rows.map((r) => r.validator_id).filter(Boolean)),
  ] as string[];

  const [{ data: tickets }, { data: validators }] = await Promise.all([
    ticketIds.length
      ? supabase
          .from("tickets")
          .select("id, short_code, customer_name")
          .in("id", ticketIds)
      : Promise.resolve({
          data: [] as { id: string; short_code: string | null; customer_name: string }[],
        }),
    validatorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", validatorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const ticketById = new Map(
    ((tickets ?? []) as { id: string; short_code: string | null; customer_name: string }[]).map(
      (t) => [t.id, t],
    ),
  );
  const validatorById = new Map(
    ((validators ?? []) as { id: string; full_name: string }[]).map((v) => [
      v.id,
      v.full_name,
    ]),
  );

  return rows.map((r) => {
    const t = r.ticket_id ? ticketById.get(r.ticket_id) : undefined;
    return {
      id: r.id,
      scanned_at: r.scanned_at,
      result: r.result,
      message: r.message,
      validator_name: r.validator_id
        ? validatorById.get(r.validator_id) ?? null
        : null,
      ticket_short_code: t?.short_code ?? null,
      ticket_customer: t?.customer_name ?? null,
    };
  });
}

/** Datos del panel de un vendedor concreto para el evento activo. */
export async function getSellerDashboard(sellerId: string) {
  const event = await getActiveEvent();
  if (!event) {
    return {
      event: null as Event | null,
      allocation: null,
      sold: 0,
      phase: null,
      sellablePhase: null as SalePhase | null,
      tickets: [] as TicketRow[],
    };
  }

  const supabase = await createClient();
  const [{ data: allocation }, { count: sold }, phases, tickets] =
    await Promise.all([
      supabase
        .from("seller_allocations")
        .select("*")
        .eq("event_id", event.id)
        .eq("seller_id", sellerId)
        .maybeSingle<SellerAllocation>(),
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("seller_id", sellerId)
        .neq("status", "cancelled"),
      getPhases(event.id),
      getSellerTickets(event.id, sellerId),
    ]);

  return {
    event,
    allocation: allocation ?? null,
    sold: sold ?? 0,
    phase: pickCurrentPhase(phases),
    sellablePhase: pickSellablePhase(phases),
    tickets,
  };
}
