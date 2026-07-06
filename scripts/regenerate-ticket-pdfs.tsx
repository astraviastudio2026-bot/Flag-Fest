/**
 * Regenera el PDF de TODAS las entradas existentes con el diseño actual
 * y lo sube a Storage (sobreescribe el archivo viejo en la misma ruta).
 * Útil tras cambiar el diseño en lib/tickets/pdf.tsx. No envía correos.
 *
 * Uso (desde la raíz del proyecto, requiere .env.local):
 *
 *   npx tsx --tsconfig scripts/tsconfig.preview.json scripts/regenerate-ticket-pdfs.tsx
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  // Imports diferidos: los módulos leen process.env al usarse y el admin
  // client exige que .env.local ya esté cargado.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { loadTicketContext, generateTicketPdfBuffer } = await import(
    "@/lib/tickets/service"
  );
  const { uploadTicketPdf } = await import("@/lib/tickets/storage");

  const admin = createAdminClient();

  const { data: tickets, error } = await admin
    .from("tickets")
    .select("id, short_code")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron listar las entradas: ${error.message}`);
  if (!tickets?.length) {
    console.log("No hay entradas que regenerar.");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const t of tickets) {
    try {
      const context = await loadTicketContext(admin, t.id);
      if (!context) throw new Error("entrada o evento no encontrados");
      const { ticket, event, phaseName } = context;
      const buffer = await generateTicketPdfBuffer(ticket, event, phaseName);
      const path = await uploadTicketPdf(admin, ticket.event_id, ticket.id, buffer);
      if (path !== ticket.pdf_storage_path) {
        await admin.from("tickets").update({ pdf_storage_path: path }).eq("id", t.id);
      }
      ok++;
      console.log(`OK  ${t.short_code ?? t.id} → ${path} (${buffer.length} bytes)`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`ERR ${t.short_code ?? t.id}: ${msg}`);
    }
  }
  console.log(`\nRegeneradas: ${ok} · Fallidas: ${failed} · Total: ${tickets.length}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
