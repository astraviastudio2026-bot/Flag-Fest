import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { Scanner } from "@/components/Scanner";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata: Metadata = {
  title: "Escáner QR · Flag-Fest",
};

export default function ScannerPage() {
  return (
    <AppShell role="scanner">
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
