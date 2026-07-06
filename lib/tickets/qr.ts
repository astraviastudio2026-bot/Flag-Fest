import "server-only";
import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";

/**
 * Utilidades de QR para las entradas.
 *
 * - `qr_token`: identificador seguro e impredecible (no secuencial).
 * - `qr_hash`: SHA-256 de `token + QR_SECRET`, verificable solo en el
 *   servidor (permite validar el token en fase 4 sin exponer el secreto).
 * - `qr_url`: única URL que contiene el QR. NO incluye datos personales.
 *
 * SOLO SERVIDOR: usa `node:crypto` y lee `QR_SECRET`.
 */

/** Genera un token de QR seguro (hex de 32 bytes). */
export function generateQrToken(): string {
  return randomBytes(32).toString("hex");
}

/** Calcula el hash SHA-256 del token combinado con `QR_SECRET`. */
export function hashQrToken(token: string): string {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    throw new Error("Falta QR_SECRET en el entorno (nunca en cliente).");
  }
  return createHash("sha256").update(`${token}.${secret}`).digest("hex");
}

/** URL de validación que codifica el QR. Solo contiene el token. */
export function qrValidationUrl(token: string): string {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/ticket/validate/${token}`;
}

/**
 * Genera el QR como Data URL PNG a partir del token.
 * El QR contiene únicamente la URL de validación.
 */
export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(qrValidationUrl(token), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Conjunto de credenciales de QR para una entrada nueva. */
export interface QrCredentials {
  token: string;
  hash: string;
  url: string;
}

/** Crea token + hash + url para una entrada nueva. */
export function createQrCredentials(): QrCredentials {
  const token = generateQrToken();
  return { token, hash: hashQrToken(token), url: qrValidationUrl(token) };
}
