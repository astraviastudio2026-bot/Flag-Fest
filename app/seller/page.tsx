import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { SellTicketForm } from "@/components/SellTicketForm";
import { TicketsTable } from "@/components/TicketsTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DollarIcon,
  GaugeIcon,
  LayersIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getSellerDashboard } from "@/lib/data";
import { navRoleForDbRole } from "@/lib/permissions";
import { formatCurrency } from "@/lib/event";
import { ROLE_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Panel de vendedor · Flag-Fest",
};

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const profile = await requireRole(["seller", "admin"]);
  const { event, allocation, sold, phase, sellablePhase, tickets } =
    await getSellerDashboard(profile.id);
  const navRole = navRoleForDbRole(profile.role);
  const isAdmin = profile.role === "admin";

  // El precio y la fase vigente se toman de la fase realmente vendible.
  const currentPhase = sellablePhase ?? phase;
  const remaining = allocation
    ? Math.max(0, allocation.allocated_quantity - sold)
    : null;

  // Motivo por el que el formulario queda deshabilitado, si aplica.
  let disabledReason: string | null = null;
  if (!sellablePhase) {
    disabledReason = "No hay una fase de venta activa para la fecha actual.";
  } else if (!isAdmin && (remaining ?? 0) <= 0) {
    disabledReason = "No tienes entradas disponibles.";
  }

  // El vendedor sin cupo no puede vender; el admin sí (venta administrativa).
  const noAllocationBlock = !allocation && !isAdmin;

  return (
    <AppShell role={navRole}>
      <Header
        title="Vender"
        subtitle="Genera entradas y consulta tu cupo asignado."
        badge={
          <StatusBadge status={profile.is_active ? "valid" : "void"}>
            {profile.is_active ? "Cuenta activa" : "Cuenta inactiva"}
          </StatusBadge>
        }
        user={{
          full_name: profile.full_name,
          username: profile.username,
          role: profile.role,
        }}
      />

      {/* Perfil del vendedor */}
      <DashboardCard className="mt-6" bodyClassName="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-accent-glow ring-1 ring-accent/30">
            <UsersIcon size={20} />
          </span>
          <div>
            <p className="font-medium text-foreground">{profile.full_name}</p>
            <p className="text-xs text-muted-2">
              {profile.username ? `@${profile.username}` : profile.email}
            </p>
          </div>
        </div>
        <div>
          <p className="font-condensed text-xs uppercase tracking-wider text-muted-2">Rol</p>
          <p className="text-sm text-foreground">{ROLE_LABELS[profile.role]}</p>
        </div>
        {event && (
          <div>
            <p className="font-condensed text-xs uppercase tracking-wider text-muted-2">Evento</p>
            <p className="text-sm text-foreground">{event.name}</p>
          </div>
        )}
      </DashboardCard>

      {!event ? (
        <div className="mt-6">
          <EmptyState
            title="No hay evento activo configurado"
            description="Cuando el administrador active un evento, verás aquí tu cupo y podrás vender."
            icon={<SettingsIcon size={26} />}
          />
        </div>
      ) : noAllocationBlock ? (
        <div className="mt-6">
          <EmptyState
            title="Sin cupo asignado"
            description="El administrador aún no te ha asignado entradas para este evento."
            icon={<TicketIcon size={26} />}
          />
        </div>
      ) : (
        <>
          {/* Métricas del vendedor */}
          {allocation ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              <StatCard
                label="Cupo asignado"
                value={allocation.allocated_quantity}
                icon={<TicketIcon size={18} />}
                accent="accent"
              />
              <StatCard
                label="Vendidas"
                value={sold}
                icon={<DollarIcon size={18} />}
                accent="green"
                progress={allocation.allocated_quantity ? (sold / allocation.allocated_quantity) * 100 : 0}
              />
              <StatCard
                label="Restantes"
                value={remaining ?? 0}
                icon={<TicketIcon size={18} />}
                accent="yellow"
                progress={
                  allocation.allocated_quantity
                    ? ((remaining ?? 0) / allocation.allocated_quantity) * 100
                    : 0
                }
              />
              <StatCard
                label="Fase actual"
                value={currentPhase?.name ?? "—"}
                icon={<LayersIcon size={18} />}
                accent="neutral"
              />
              <StatCard
                label="Precio actual"
                value={sellablePhase ? formatCurrency(Number(sellablePhase.price)) : "—"}
                icon={<GaugeIcon size={18} />}
                accent="green"
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              <StatCard
                label="Vendidas (admin)"
                value={sold}
                icon={<DollarIcon size={18} />}
                accent="green"
              />
              <StatCard
                label="Fase actual"
                value={currentPhase?.name ?? "—"}
                icon={<LayersIcon size={18} />}
                accent="neutral"
              />
              <StatCard
                label="Precio actual"
                value={sellablePhase ? formatCurrency(Number(sellablePhase.price)) : "—"}
                icon={<GaugeIcon size={18} />}
                accent="green"
              />
            </div>
          )}

          {/* Formulario de venta real */}
          <DashboardCard
            title="Vender entrada"
            subtitle="Genera la entrada, el QR y el PDF, y envíalo automáticamente al correo del cliente."
            className="mt-6"
          >
            <SellTicketForm disabledReason={disabledReason} />
          </DashboardCard>

          {/* Ventas del vendedor */}
          <DashboardCard
            title="Mis ventas"
            subtitle="Entradas que has generado. Descarga el PDF o reenvía el correo."
            className="mt-6"
            bodyClassName="p-0"
          >
            {tickets.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Aún no has vendido entradas"
                  description="Cuando generes tu primera entrada, aparecerá aquí."
                  icon={<TicketIcon size={26} />}
                />
              </div>
            ) : (
              <TicketsTable tickets={tickets} />
            )}
          </DashboardCard>
        </>
      )}
    </AppShell>
  );
}
