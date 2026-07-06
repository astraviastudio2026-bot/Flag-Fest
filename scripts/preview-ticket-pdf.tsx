/**
 * Genera PDFs de entrada de muestra para revisar el diseño sin tocar la
 * base de datos ni enviar correos. Uso (desde la raíz del proyecto):
 *
 *   npx tsx --tsconfig scripts/tsconfig.preview.json scripts/preview-ticket-pdf.tsx
 *
 * Escribe los PDFs en `.pdf-preview/` (ignorado por git). El tsconfig
 * mapea "server-only" a un stub para poder ejecutarlo fuera de Next.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { renderTicketPdf } from "@/lib/tickets/pdf";
import type { TicketColor } from "@/lib/types";

const OUT_DIR = path.join(process.cwd(), ".pdf-preview");

const CASES: Array<{ name: string; color: TicketColor; file: string }> = [
  { name: "Juan Pérez", color: "verde", file: "verde-corto.pdf" },
  { name: "Josue Marcelo Chamba León", color: "rojo", file: "rojo-medio.pdf" },
  {
    name: "María Fernanda Alexandra Rodríguez Castillo",
    color: "amarillo",
    file: "amarillo-largo.pdf",
  },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const qrDataUrl = await QRCode.toDataURL(
    "https://flag-fest.example.com/ticket/validate/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    { errorCorrectionLevel: "M", margin: 1, width: 512 },
  );

  for (const c of CASES) {
    const buffer = await renderTicketPdf({
      eventName: "FLAGS FEST",
      location: "Paradox Club",
      eventDate: "30/07/2026",
      customerName: c.name,
      color: c.color,
      phaseName: "Preventa 1",
      price: "$12,00",
      ticketNumber: "0001",
      shortCode: "FF-0001",
      qrDataUrl,
    });
    const out = path.join(OUT_DIR, c.file);
    writeFileSync(out, buffer);
    console.log(`OK ${out} (${buffer.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
