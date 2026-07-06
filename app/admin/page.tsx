import type { Metadata } from "next";
import { ActionButton } from "@/components/ActionButton";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import {
  CameraIcon,
  DollarIcon,
  LayersIcon,
  PlusIcon,
  QrIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/icons";
import { EVENT, activePhase, formatCurrency, getFlagColor } from "@/lib/event";

export const metadata: Metadata = {
  title: "Panel de administración · Flag-Fest",
};

const total = EVENT.totalTickets;
const sold = 0;
const used = 0;
const voided = 0;
const available = total - sold - voided;
const income = 0;

const actions = [
  { label: "Crear vendedor", icon: <UsersIcon size={18} />, href: "/seller" },
  { label: "Configurar evento", icon: <SettingsIcon size={18} />, href: "/admin" },
  { label: "Configurar fases", icon: <LayersIcon size={18} />, href: "/admin" },
  { label: "Asignar cupos", icon: <PlusIcon size={18} />, href: "/admin" },
  { label: "Ver entradas", icon: <TicketIcon size={18} />, href: "/admin" },
  { label: "Abrir escáner", icon: <CameraIcon size={18} />, href: "/scanner" },
];

// Ventas recientes de ejemplo (maqueta — vacío por defecto en fase 1).
const recentSales: {
  id: string;
  name: string;
  seller: string;
  color: "verde" | "rojo" | "amarillo";
  amount: number;
  status: TicketStatus;
}[] = [];

export default function AdminPage() {
  return (
    <AppShell role="admin">
      <Header
        title="Panel"
        subtitle={`${EVENT.name} · ${EVENT.tagline}`}
        badge={
          <StatusBadge status="pending">
            Fase: {activePhase().name}
          </StatusBadge>
        }
        actions={
          <ActionButton
            href="/seller"
            size="sm"
            icon={<PlusIcon size={16} />}
          >
            Crear vendedor
          </ActionButton>
        }
      />

      {/* Métricas */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label="Total entradas"
          value={total}
          icon={<TicketIcon size={18} />}
          accent="neutral"
        />
        <StatCard
          label="Vendidas"
          value={sold}
          hint={`${Math.round((sold / total) * 100)}% del total`}
          icon={<DollarIcon size={18} />}
          accent="green"
          progress={(sold / total) * 100}
        />
        <StatCard
          label="Disponibles"
          value={available}
          icon={<TicketIcon size={18} />}
          accent="accent"
          progress={(available / total) * 100}
        />
        <StatCard
          label="Usadas"
          value={used}
          icon={<QrIcon size={18} />}
          accent="yellow"
        />
        <StatCard
          label="Anuladas"
          value={voided}
          icon={<TicketIcon size={18} />}
          accent="red"
        />
        <StatCard
          label="Ingresos estimados"
          value={formatCurrency(income)}
          icon={<DollarIcon size={18} />}
          accent="green"
        />
      </div>

      {/* Acciones rápidas */}
      <DashboardCard
        title="Acciones rápidas"
        subtitle="Gestiona el evento, vendedores y validación."
        className="mt-6"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <ActionButton
              key={a.label}
              href={a.href}
              variant="surface"
              size="lg"
              icon={a.icon}
              className="justify-start"
            >
              {a.label}
            </ActionButton>
          ))}
        </div>
      </DashboardCard>

      {/* Ventas recientes */}
      <DashboardCard
        title="Ventas recientes"
        subtitle="Últimas entradas generadas por los vendedores."
        className="mt-6"
        action={
          <ActionButton href="/admin" variant="ghost" size="sm">
            Ver todas
          </ActionButton>
        }
        bodyClassName="p-0"
      >
        {recentSales.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Aún no hay ventas"
              description="Cuando los vendedores generen entradas, aparecerán aquí en tiempo real."
              icon={<TicketIcon size={26} />}
              action={
                <ActionButton href="/seller" size="sm" variant="surface">
                  Ir a vender
                </ActionButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-3 font-condensed font-medium">Cliente</th>
                  <th className="px-5 py-3 font-condensed font-medium">Vendedor</th>
                  <th className="px-5 py-3 font-condensed font-medium">Color</th>
                  <th className="px-5 py-3 font-condensed font-medium">Monto</th>
                  <th className="px-5 py-3 font-condensed font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => {
                  const c = getFlagColor(s.color);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/60 last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        {s.name}
                      </td>
                      <td className="px-5 py-3 text-muted">{s.seller}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
                          />
                          {c.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        {formatCurrency(s.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </AppShell>
  );
}
