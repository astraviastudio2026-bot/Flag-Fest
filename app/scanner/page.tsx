import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { Scanner } from "@/components/Scanner";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";
import { navRoleForDbRole } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Escáner QR · Flag-Fest",
};

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const profile = await requireRole(["validator", "admin"]);
  const navRole = navRoleForDbRole(profile.role);

  return (
    <AppShell role={navRole}>
      <Header
        title="Escáner QR"
        subtitle="Valida las entradas en la puerta del evento."
        badge={<StatusBadge status="pending">Modo demo</StatusBadge>}
      />
      <div className="mt-6">
        <Scanner />
      </div>
    </AppShell>
  );
}
