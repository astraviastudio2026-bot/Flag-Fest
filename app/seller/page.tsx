import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { SellForm } from "@/components/SellForm";
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
  const { event, allocation, sold, phase } = await getSellerDashboard(profile.id);
  const navRole = navRoleForDbRole(profile.role);

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
      ) : !allocation ? (
        <div className="mt-6">
          <EmptyState
            title="Sin cupo asignado"
            description="El administrador aún no te ha asignado entradas para este evento."
            icon={<TicketIcon size={26} />}
          />
        </div>
      ) : (
        <>
          {/* Métricas reales del vendedor */}
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
              value={Math.max(0, allocation.allocated_quantity - sold)}
              icon={<TicketIcon size={18} />}
              accent="yellow"
              progress={
                allocation.allocated_quantity
                  ? (Math.max(0, allocation.allocated_quantity - sold) /
                      allocation.allocated_quantity) *
                    100
                  : 0
              }
            />
            <StatCard
              label="Fase actual"
              value={phase?.name ?? "—"}
              icon={<LayersIcon size={18} />}
              accent="neutral"
            />
            <StatCard
              label="Precio actual"
              value={phase ? formatCurrency(Number(phase.price)) : "—"}
              icon={<GaugeIcon size={18} />}
              accent="green"
            />
          </div>

          {/* Formulario de venta (visual — la venta real llega en fase 3) */}
          <DashboardCard
            title="Vender entrada"
            subtitle="Vista previa de la entrada. La generación real de QR y PDF llegará en la siguiente fase."
            className="mt-6"
          >
            <SellForm />
          </DashboardCard>
        </>
      )}
    </AppShell>
  );
}
