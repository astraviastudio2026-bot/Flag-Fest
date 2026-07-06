import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { TicketColor } from "@/lib/types";

/**
 * Generación del PDF de la entrada con @react-pdf/renderer (server-side).
 *
 * Talón horizontal con estética Flag Fest: fondo oscuro, acento neón
 * según el color elegido, logo/texto FLAGS FEST, QR a la derecha y las
 * leyendas obligatorias. Inspirado en /public/branding/formato-entrada.png.
 *
 * Tipografías de marca (Anton para los display, Oswald para el resto),
 * las mismas que usa la app. Se registran como Data URI para no depender
 * del sistema de archivos ni de la red durante el render en producción.
 */

export interface TicketPdfData {
  eventName: string;
  location: string;
  eventDate: string; // ya formateada (p. ej. "30/07/2026")
  customerName: string;
  color: TicketColor;
  phaseName: string;
  price: string; // ya formateado (p. ej. "$12,00")
  ticketNumber: string; // p. ej. "0001"
  shortCode: string; // p. ej. "FF-0001"
  qrDataUrl: string; // PNG data URL
}

// ------------------------------------------------------------------
// Registro de fuentes (diferido y una sola vez, en tiempo de render).
// ------------------------------------------------------------------
let fontsReady = false;

function fontDataUri(file: string): string {
  const filePath = path.join(process.cwd(), "lib", "tickets", "fonts", file);
  const base64 = readFileSync(filePath).toString("base64");
  return `data:font/ttf;base64,${base64}`;
}

function ensureFonts(): void {
  if (fontsReady) return;
  Font.register({ family: "Anton", src: fontDataUri("Anton-Regular.ttf") });
  Font.register({
    family: "Oswald",
    fonts: [
      { src: fontDataUri("Oswald-Regular.ttf"), fontWeight: 400 },
      { src: fontDataUri("Oswald-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Evita cortes de palabra automáticos (nombres, códigos) en el PDF.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

interface ColorSpec {
  label: string;
  message: string;
  description: string;
  hex: string;
}

const COLOR_SPECS: Record<TicketColor, ColorSpec> = {
  verde: {
    label: "VERDE",
    message: "Soltero/a",
    description: "Abierto/a a conocer a alguien especial",
    hex: "#2fd35a",
  },
  rojo: {
    label: "ROJO",
    message: "No busco nada",
    description: "Disfruto la noche, sin etiquetas",
    hex: "#e11d2e",
  },
  amarillo: {
    label: "AMARILLO",
    message: "Depende",
    description: "Todo puede pasar, déjate llevar",
    hex: "#f5b800",
  },
};

const BG = "#06060a";
const PANEL = "#0c0c12";
const MUTED = "#8b8b99";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG,
    padding: 24,
    fontFamily: "Oswald",
  },
  ticket: {
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    flexGrow: 1,
  },
  // Talón izquierdo
  stub: {
    width: 96,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 22,
    borderRightWidth: 1,
    borderRightStyle: "dashed",
  },
  stubBrand: {
    fontFamily: "Anton",
    fontSize: 17,
    color: WHITE,
    textAlign: "center",
    letterSpacing: 1,
  },
  stubFest: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 9,
    color: WHITE,
    letterSpacing: 4,
    marginTop: 3,
  },
  stubNumber: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 10,
    color: WHITE,
    opacity: 0.75,
  },
  stubLabel: {
    fontSize: 6,
    color: MUTED,
    letterSpacing: 1,
    marginTop: 2,
  },
  // Centro
  center: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: "Anton",
    fontSize: 38,
    color: WHITE,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 1,
    marginTop: 4,
  },
  colorBlock: {
    alignItems: "flex-end",
  },
  colorLabel: {
    fontFamily: "Anton",
    fontSize: 26,
    letterSpacing: 1,
  },
  colorMessage: {
    fontFamily: "Oswald",
    fontWeight: 400,
    fontSize: 15,
    marginTop: 2,
  },
  colorDesc: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff22",
    marginVertical: 12,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailItem: {
    width: "33.33%",
    marginBottom: 8,
    paddingRight: 8,
  },
  detailLabel: {
    fontSize: 6,
    color: MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 10,
    color: WHITE,
    fontFamily: "Oswald",
    fontWeight: 700,
    marginTop: 2,
  },
  slogan: {
    fontSize: 8,
    fontFamily: "Oswald",
    fontWeight: 700,
    letterSpacing: 1,
    marginTop: 6,
  },
  // Derecha (QR)
  qrPanel: {
    width: 190,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderLeftWidth: 1,
    borderLeftStyle: "dashed",
  },
  qrBox: {
    backgroundColor: WHITE,
    padding: 8,
    borderRadius: 8,
  },
  qrImage: {
    width: 118,
    height: 118,
  },
  paradox: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 6,
    marginTop: 12,
    textAlign: "center",
  },
  qrLegend: {
    fontSize: 6,
    color: WHITE,
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  qrLegendMuted: {
    fontSize: 5.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 3,
  },
  // Pie legal
  legalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
  },
  legalStrong: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 7,
    color: WHITE,
    letterSpacing: 1,
  },
  legalMuted: {
    fontSize: 6,
    color: MUTED,
    letterSpacing: 0.5,
  },
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TicketDocument({ data }: { data: TicketPdfData }) {
  const spec = COLOR_SPECS[data.color] ?? COLOR_SPECS.verde;
  const tint = spec.hex;

  return (
    <Document
      title={`Entrada ${data.shortCode} · ${data.eventName}`}
      author="Flag Fest"
    >
      <Page size={[820, 360]} orientation="landscape" style={styles.page}>
        <View style={[styles.ticket, { borderColor: `${tint}` }]}>
          <View style={styles.topRow}>
            {/* Talón izquierdo */}
            <View style={[styles.stub, { backgroundColor: `${tint}22`, borderRightColor: `${tint}66` }]}>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.stubBrand}>FLAGS</Text>
                <Text style={styles.stubFest}>FEST</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.stubNumber}>N.º {data.ticketNumber}</Text>
                <Text style={styles.stubLabel}>{data.shortCode}</Text>
              </View>
            </View>

            {/* Centro */}
            <View style={styles.center}>
              <View style={styles.brandRow}>
                <View>
                  <Text style={styles.brand}>FLAGS FEST</Text>
                  <Text style={styles.brandSub}>
                    GREEN FLAGS & RED FLAGS PARTY
                  </Text>
                </View>
                <View style={styles.colorBlock}>
                  <Text style={[styles.colorLabel, { color: tint }]}>
                    {spec.label}
                  </Text>
                  <Text style={[styles.colorMessage, { color: tint }]}>
                    {spec.message}
                  </Text>
                  <Text style={styles.colorDesc}>{spec.description}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsGrid}>
                <Detail label="Asistente" value={data.customerName} />
                <Detail label="Evento" value={data.eventName} />
                <Detail label="Lugar" value={data.location || "—"} />
                <Detail label="Fecha" value={data.eventDate} />
                <Detail label="Fase" value={data.phaseName} />
                <Detail label="Precio" value={data.price} />
              </View>

              <Text style={[styles.slogan, { color: tint }]}>
                ELIGE TU COLOR, VIVE LA NOCHE.
              </Text>
            </View>

            {/* Derecha: QR */}
            <View style={[styles.qrPanel, { borderLeftColor: `${tint}66` }]}>
              <View style={styles.qrBox}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image style={styles.qrImage} src={data.qrDataUrl} />
              </View>
              <Text style={[styles.paradox, { color: tint }]}>PARADOX</Text>
              <Text style={styles.qrLegend}>
                PRESENTAR ESTE CÓDIGO QR EL DÍA DEL EVENTO
              </Text>
              <Text style={styles.qrLegendMuted}>
                Este código QR será válido una sola vez.
              </Text>
            </View>
          </View>

          {/* Pie legal */}
          <View style={[styles.legalBar, { borderTopColor: `${tint}66`, backgroundColor: `${tint}14` }]}>
            <Text style={styles.legalStrong}>
              ENTRADA ÚNICA E INTRANSFERIBLE
            </Text>
            <Text style={styles.legalMuted}>
              {data.shortCode} · N.º {data.ticketNumber}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** Renderiza el PDF de la entrada a un Buffer (Node, server-side). */
export async function renderTicketPdf(data: TicketPdfData): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<TicketDocument data={data} />);
}
