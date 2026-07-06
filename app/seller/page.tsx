import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { Header } from "@/components/Header";
import { SellForm } from "@/components/SellForm";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DollarIcon,
  GaugeIcon,
  LayersIcon,
  TicketIcon,
} from "@/components/icons";
import { activePhase, formatCurrency } from "@/lib/event";

export const metadata: Metadata = {
  title: "Panel de vendedor · Flag-Fest",
};

const quota = 50;
const sold = 0;
const remaining = quota - sold;
const phase = activePhase();

export default function SellerPage() {
  return (
    <AppShell role="seller">
      <Header
        title="Vender"
        subtitle="Genera entradas y consulta tu cupo asignado."
        badge={<StatusBadge status="valid">Cuenta activa</StatusBadge>}
      />

      {/* Métricas del vendedor */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Cupo asignado"
          value={quota}
          icon={<TicketIcon size={18} />}
          accent="accent"
        />
        <StatCard
          label="Vendidas"
          value={sold}
          icon={<DollarIcon size={18} />}
          accent="green"
          progress={(sold / quota) * 100}
        />
        <StatCard
          label="Restantes"
          value={remaining}
          icon={<TicketIcon size={18} />}
          accent="yellow"
          progress={(remaining / quota) * 100}
        />
        <StatCard
          label="Fase actual"
          value={phase.name}
          icon={<LayersIcon size={18} />}
          accent="neutral"
        />
        <StatCard
          label="Precio actual"
          value={formatCurrency(phase.price)}
          icon={<GaugeIcon size={18} />}
          accent="green"
        />
      </div>

      {/* Formulario de venta */}
      <DashboardCard
        title="Vender entrada"
        subtitle="Completa los datos del cliente para generar su entrada."
        className="mt-6"
      >
        <SellForm />
      </DashboardCard>
    </AppShell>
  );
}
