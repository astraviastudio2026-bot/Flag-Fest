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
 * Hoja A4 horizontal con la entrada centrada: talón izquierdo, área
 * central con los datos y panel derecho con el QR. Fondo oscuro y borde
 * neón según el color elegido. Layout 100% flexbox (sin posiciones
 * absolutas) para que nada se monte ni se corte.
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

// ------------------------------------------------------------------
// Medidas fijas (pt). 1 mm = 2.83465 pt.
// A4 horizontal: 841.89 × 595.28 pt (297 × 210 mm).
// ------------------------------------------------------------------
const MM = 2.83465;
const TICKET_W = 260 * MM; // ≈ 737 pt
const TICKET_H = 95 * MM; // ≈ 269 pt
const STUB_W = 30 * MM; // ≈ 85 pt
const QR_PANEL_W = 60 * MM; // ≈ 170 pt
const QR_SIZE = 40 * MM; // ≈ 113 pt (dentro del rango 38–45 mm)

const BG = "#050508";
const TICKET_BG = "#0a0a10";
const PANEL = "#0e0e15";
const MUTED = "#8b8b99";
const WHITE = "#ffffff";

/**
 * Mezcla el acento con el fondo del ticket y devuelve un hex SÓLIDO.
 * react-pdf renderiza mal los colores con alfa en bordes (sobre todo
 * en los punteados), así que pre-calculamos el color ya compuesto.
 */
function tintAlpha(hex: string, alpha: number): string {
  const bg = [10, 10, 16]; // TICKET_BG #0a0a10
  const mix = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(c * alpha + bg[i] * (1 - alpha));
  };
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(0))}${to2(mix(1))}${to2(mix(2))}`;
}

/** Tamaño de fuente del nombre según su longitud (máx. 2 líneas). */
function nameFontSize(name: string): number {
  const n = name.length;
  if (n <= 22) return 16;
  if (n <= 34) return 14;
  if (n <= 46) return 12;
  return 11;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG,
    fontFamily: "Oswald",
    alignItems: "center",
    justifyContent: "center",
    padding: 12 * MM,
  },
  ticket: {
    width: TICKET_W,
    height: TICKET_H,
    backgroundColor: TICKET_BG,
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "column",
  },
  topRow: {
    flex: 1,
    flexDirection: "row",
  },
  // Talón izquierdo
  stub: {
    width: STUB_W,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightStyle: "dashed",
  },
  stubBrand: {
    fontFamily: "Anton",
    fontSize: 15,
    color: WHITE,
    textAlign: "center",
    letterSpacing: 1,
  },
  stubFest: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 8,
    color: WHITE,
    letterSpacing: 4,
    marginTop: 2,
    textAlign: "center",
  },
  stubNumber: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 9,
    color: WHITE,
    opacity: 0.85,
    textAlign: "center",
  },
  stubCode: {
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 1,
    marginTop: 2,
    textAlign: "center",
  },
  // Centro
  center: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: "Anton",
    fontSize: 30,
    color: WHITE,
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  colorBlock: {
    alignItems: "flex-end",
    maxWidth: 170,
  },
  colorLabel: {
    fontFamily: "Anton",
    fontSize: 20,
    letterSpacing: 1,
  },
  colorMessage: {
    fontFamily: "Oswald",
    fontWeight: 400,
    fontSize: 13,
    marginTop: 1,
  },
  colorDesc: {
    fontSize: 7,
    color: MUTED,
    marginTop: 2,
    textAlign: "right",
  },
  nameBlock: {
    marginTop: 4,
  },
  nameLabel: {
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  nameValue: {
    color: WHITE,
    fontFamily: "Oswald",
    fontWeight: 700,
    marginTop: 2,
    maxLines: 2,
    textOverflow: "ellipsis",
  },
  detailsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  detailItem: {
    flex: 1,
    paddingRight: 6,
  },
  detailLabel: {
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 9.5,
    color: WHITE,
    fontFamily: "Oswald",
    fontWeight: 700,
    marginTop: 2,
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  slogan: {
    fontSize: 8,
    fontFamily: "Oswald",
    fontWeight: 700,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  // Derecha (QR)
  qrPanel: {
    width: QR_PANEL_W,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftStyle: "dashed",
  },
  qrBox: {
    backgroundColor: WHITE,
    padding: 6,
    borderRadius: 6,
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  paradox: {
    fontFamily: "Oswald",
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 8,
    textAlign: "center",
  },
  qrLegend: {
    fontSize: 6,
    color: WHITE,
    textAlign: "center",
    marginTop: 5,
    letterSpacing: 0.5,
  },
  qrLegendMuted: {
    fontSize: 5.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 2,
  },
  // Pie legal
  legalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
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
    fontSize: 7,
    color: MUTED,
    letterSpacing: 0.5,
  },
  // Marca discreta bajo la entrada, dentro de la hoja A4.
  pageMark: {
    marginTop: 14,
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 2,
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
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={[styles.ticket, { borderColor: tint }]}>
          <View style={styles.topRow}>
            {/* Talón izquierdo */}
            <View
              style={[
                styles.stub,
                { backgroundColor: tintAlpha(tint, 0.13), borderRightColor: tintAlpha(tint, 0.4) },
              ]}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={styles.stubBrand}>FLAGS</Text>
                <Text style={styles.stubFest}>FEST</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.stubNumber}>N.º {data.ticketNumber}</Text>
                <Text style={styles.stubCode}>{data.shortCode}</Text>
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

              <View style={styles.nameBlock}>
                <Text style={styles.nameLabel}>Asistente</Text>
                <Text
                  style={[
                    styles.nameValue,
                    { fontSize: nameFontSize(data.customerName) },
                  ]}
                >
                  {data.customerName}
                </Text>
              </View>

              <View style={styles.detailsRow}>
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
            <View style={[styles.qrPanel, { borderLeftColor: tintAlpha(tint, 0.4) }]}>
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
          <View
            style={[
              styles.legalBar,
              { borderTopColor: tintAlpha(tint, 0.4), backgroundColor: tintAlpha(tint, 0.08) },
            ]}
          >
            <Text style={styles.legalStrong}>
              ENTRADA ÚNICA E INTRANSFERIBLE
            </Text>
            <Text style={styles.legalMuted}>
              {data.shortCode} · N.º {data.ticketNumber}
            </Text>
          </View>
        </View>

        <Text style={styles.pageMark}>
          FLAGS FEST · GREEN FLAGS & RED FLAGS PARTY
        </Text>
      </Page>
    </Document>
  );
}

/** Renderiza el PDF de la entrada a un Buffer (Node, server-side). */
export async function renderTicketPdf(data: TicketPdfData): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<TicketDocument data={data} />);
}
