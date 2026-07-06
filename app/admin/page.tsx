import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketsTable } from "@/components/TicketsTable";
import { EventForm } from "@/components/admin/EventForm";
import { PhaseForm } from "@/components/admin/PhaseForm";
import { AllocationForm } from "@/components/admin/AllocationForm";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { UsersList } from "@/components/admin/UsersList";
import {
  DollarIcon,
  QrIcon,
  SettingsIcon,
  TicketIcon,
} from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  getActiveEvent,
  getAllocations,
  getEventStats,
  getEventTickets,
  getManageableUsers,
  getPhases,
  getRecentValidations,
  getSellers,
  pickCurrentPhase,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/event";

export const metadata: Metadata = {
  title: "Panel de administración · Flag-Fest",
};

// Panel autenticado por usuario: siempre dinámico, nunca estático.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireRole(["admin"]);
  const headerUser = {
    full_name: profile.full_name,
    username: profile.username,
    role: profile.role,
  };
  const event = await getActiveEvent();

  // Sin evento activo: empty state elegante + formulario para crearlo.
  if (!event) {
    const users = await getManageableUsers();
    return (
      <AppShell role="admin">
        <Header
          title="Panel"
          subtitle="Flags Fest · Green Flags & Red Flags Party"
          user={headerUser}
        />

        <div className="mt-6">
          <EmptyState
            title="No hay evento activo configurado"
            description="Crea y activa un evento para empezar a configurar fases, cupos y ventas."
            icon={<SettingsIcon size={26} />}
          />
        </div>

        <DashboardCard title="Crear evento" subtitle="Configura los datos del evento." className="mt-6">
          <EventForm />
        </DashboardCard>

        <DashboardCard
          title="Usuarios"
          subtitle="Crea vendedores y validadores."
          className="mt-6"
        >
          <div className="flex flex-col gap-6">
            <CreateUserForm />
            <UsersList users={users} />
          </div>
        </DashboardCard>
      </AppShell>
    );
  }

  const [stats, phases, users, sellers, allocations, tickets, validations] =
    await Promise.all([
      getEventStats(event),
      getPhases(event.id),
      getManageableUsers(),
      getSellers(),
      getAllocations(event.id),
      getEventTickets(event.id),
      getRecentValidations(10),
    ]);

  const currentPhase = pickCurrentPhase(phases);
  const nextOrder = phases.length
    ? Math.max(...phases.map((p) => p.phase_order)) + 1
    : 1;
  const pct = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);

  return (
    <AppShell role="admin">
      <Header
        title="Panel"
        subtitle={`${event.name}${event.location ? ` · ${event.location}` : ""}`}
        badge={
          <StatusBadge status="pending">
            {currentPhase ? `Fase: ${currentPhase.name}` : "Sin fase vigente"}
          </StatusBadge>
        }
        user={headerUser}
      />

      {/* Métricas reales */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total entradas" value={stats.total} icon={<TicketIcon size={18} />} accent="neutral" />
        <StatCard
          label="Vendidas"
          value={stats.sold}
          hint={`${Math.round(pct(stats.sold))}% del total`}
          icon={<DollarIcon size={18} />}
          accent="green"
          progress={pct(stats.sold)}
        />
        <StatCard
          label="Disponibles"
          value={stats.available}
          icon={<TicketIcon size={18} />}
          accent="accent"
          progress={pct(stats.available)}
        />
        <StatCard label="Usadas" value={stats.used} icon={<QrIcon size={18} />} accent="yellow" />
        <StatCard label="Anuladas" value={stats.cancelled} icon={<TicketIcon size={18} />} accent="red" />
        <StatCard
          label="Ingresos estimados"
          value={formatCurrency(stats.income)}
          icon={<DollarIcon size={18} />}
          accent="green"
        />
      </div>

      {/* Configuración del evento */}
      <DashboardCard
        title="Configurar evento"
        subtitle="Edita los datos del evento activo."
        className="mt-6"
      >
        <EventForm event={event} />
      </DashboardCard>

      {/* Fases de venta */}
      <DashboardCard
        title="Fases de venta"
        subtitle="Define precios escalonados por rango de fechas."
        className="mt-6"
      >
        <div className="flex flex-col gap-6">
          {phases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
                    <th className="px-4 py-3 font-condensed font-medium">#</th>
                    <th className="px-4 py-3 font-condensed font-medium">Fase</th>
                    <th className="px-4 py-3 font-condensed font-medium">Vigencia</th>
                    <th className="px-4 py-3 font-condensed font-medium">Precio</th>
                    <th className="px-4 py-3 font-condensed font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-muted-2">{p.phase_order}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {p.name}
                        {currentPhase?.id === p.id && (
                          <span className="ml-2 text-xs text-accent-glow">· vigente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-2 whitespace-nowrap">
                        {formatDate(p.starts_at)} – {formatDate(p.ends_at)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatCurrency(Number(p.price))}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.is_active ? "valid" : "invalid"}>
                          {p.is_active ? "Activa" : "Inactiva"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">Aún no hay fases configuradas.</p>
          )}

          <div className="border-t border-border pt-6">
            <h3 className="mb-4 font-condensed text-sm font-semibold uppercase tracking-wide text-muted">
              Nueva fase
            </h3>
            <PhaseForm eventId={event.id} nextOrder={nextOrder} />
          </div>
        </div>
      </DashboardCard>

      {/* Usuarios */}
      <DashboardCard
        title="Usuarios"
        subtitle="Crea vendedores/validadores y gestiona su acceso."
        className="mt-6"
      >
        <div className="flex flex-col gap-6">
          <CreateUserForm />
          <div className="border-t border-border pt-6">
            <UsersList users={users} />
          </div>
        </div>
      </DashboardCard>

      {/* Asignación de cupos */}
      <DashboardCard
        title="Asignar cupos"
        subtitle="Reparte entradas entre los vendedores."
        className="mt-6"
      >
        <div className="flex flex-col gap-6">
          {allocations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
                    <th className="px-4 py-3 font-condensed font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-condensed font-medium">Cupo</th>
                    <th className="px-4 py-3 font-condensed font-medium">Vendidas</th>
                    <th className="px-4 py-3 font-condensed font-medium">Restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {a.seller?.full_name ?? "—"}
                        <span className="block text-xs text-muted-2">{a.seller?.email}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{a.allocated_quantity}</td>
                      <td className="px-4 py-3 text-muted">{a.sold}</td>
                      <td className="px-4 py-3 text-foreground">
                        {Math.max(0, a.allocated_quantity - a.sold)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={allocations.length > 0 ? "border-t border-border pt-6" : ""}>
            <AllocationForm
              eventId={event.id}
              sellers={sellers.map((s) => ({
                id: s.id,
                full_name: s.full_name,
                email: s.email,
              }))}
            />
          </div>
        </div>
      </DashboardCard>

      {/* Ventas reales */}
      <DashboardCard
        title="Ventas"
        subtitle="Todas las entradas generadas. Descarga el PDF o reenvía el correo."
        className="mt-6"
        bodyClassName="p-0"
      >
        {tickets.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Aún no hay ventas"
              description="Cuando los vendedores generen entradas, aparecerán aquí."
              icon={<TicketIcon size={26} />}
            />
          </div>
        ) : (
          <TicketsTable tickets={tickets} showSeller />
        )}
      </DashboardCard>

      {/* Últimas validaciones en puerta */}
      <DashboardCard
        title="Últimas validaciones"
        subtitle="Escaneos registrados por el personal en la puerta."
        className="mt-6"
        bodyClassName="p-0"
      >
        {validations.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Aún no hay validaciones"
              description="Cuando el personal escanee entradas en la puerta, los intentos aparecerán aquí."
              icon={<QrIcon size={26} />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-4 py-3 font-condensed font-medium">Hora</th>
                  <th className="px-4 py-3 font-condensed font-medium">Código</th>
                  <th className="px-4 py-3 font-condensed font-medium">Cliente</th>
                  <th className="px-4 py-3 font-condensed font-medium">Validador</th>
                  <th className="px-4 py-3 font-condensed font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {validations.map((v) => (
                  <tr key={v.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-2">
                      {formatScanTime(v.scanned_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {v.ticket_short_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {v.ticket_customer ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {v.validator_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={VALIDATION_BADGE[v.result] ?? "invalid"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </AppShell>
  );
}

/** Resultado de ticket_validations → variante visual del StatusBadge. */
const VALIDATION_BADGE: Record<
  string,
  "valid" | "used" | "void" | "invalid"
> = {
  valid: "valid",
  already_used: "used",
  cancelled: "void",
  invalid: "invalid",
};

/** Timestamp del escaneo → fecha y hora locales de Ecuador. */
function formatScanTime(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}
