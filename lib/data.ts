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

/** Datos del panel de un vendedor concreto para el evento activo. */
export async function getSellerDashboard(sellerId: string) {
  const event = await getActiveEvent();
  if (!event) {
    return { event: null as Event | null, allocation: null, sold: 0, phase: null };
  }

  const supabase = await createClient();
  const [{ data: allocation }, { count: sold }, phases] = await Promise.all([
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
  ]);

  return {
    event,
    allocation: allocation ?? null,
    sold: sold ?? 0,
    phase: pickCurrentPhase(phases),
  };
}
