/**
 * Plantillas del correo de entrega de la entrada.
 *
 * Solo texto/HTML — sin dependencias de servidor. El envío real vive en
 * `lib/email/resend.ts`.
 */

export const TICKET_EMAIL_SUBJECT = "Tu entrada para Flag Fest";

export interface TicketEmailContent {
  customerName: string;
  eventName: string;
  eventDate: string;
  location: string;
  color: string; // etiqueta legible (p. ej. "Verde")
  shortCode: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Cuerpo HTML del correo de entrega. */
export function ticketEmailHtml(c: TicketEmailContent): string {
  const name = escapeHtml(c.customerName);
  const rows: [string, string][] = [
    ["Evento", c.eventName],
    ["Fecha", c.eventDate],
    ["Lugar", c.location],
    ["Color seleccionado", c.color],
    ["Código de entrada", c.shortCode],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#8b8b99;font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#f4f4f6;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#06060a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06060a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0c0c12;border:1px solid #1c1c26;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">FLAGS FEST</p>
                <p style="margin:4px 0 0 0;color:#8b8b99;font-size:11px;letter-spacing:1px;">GREEN FLAGS &amp; RED FLAGS PARTY</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;color:#e6e6ea;font-size:14px;line-height:1.6;">
                <p style="margin:0 0 14px 0;">Hola, <strong style="color:#ffffff;">${name}</strong>:</p>
                <p style="margin:0 0 14px 0;">Tu entrada para Flag Fest ha sido generada correctamente.</p>
                <p style="margin:0 0 14px 0;">Adjuntamos tu entrada en formato PDF. Debes presentar el código QR el día del evento para ingresar.</p>

                <p style="margin:18px 0 8px 0;color:#8b8b99;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Detalles de tu entrada</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1c1c26;">
                  ${detailRows}
                </table>

                <p style="margin:20px 0 0 0;padding:12px 14px;background:#14141c;border-radius:10px;color:#c9c9d2;font-size:12px;line-height:1.6;">
                  <strong style="color:#ffffff;">Importante:</strong> Esta entrada es única e intransferible.
                  El código QR solo podrá ser validado una vez en el ingreso al evento.
                </p>

                <p style="margin:22px 0 0 0;">Nos vemos en Flag Fest.</p>
                <p style="margin:4px 0 0 0;color:#8b8b99;">Equipo Flag Fest</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Versión en texto plano (fallback). */
export function ticketEmailText(c: TicketEmailContent): string {
  return [
    `Hola, ${c.customerName}:`,
    "",
    "Tu entrada para Flag Fest ha sido generada correctamente.",
    "",
    "Adjuntamos tu entrada en formato PDF. Debes presentar el código QR el día del evento para ingresar.",
    "",
    "Detalles de tu entrada:",
    `Evento: ${c.eventName}`,
    `Fecha: ${c.eventDate}`,
    `Lugar: ${c.location}`,
    `Color seleccionado: ${c.color}`,
    `Código de entrada: ${c.shortCode}`,
    "",
    "Importante:",
    "Esta entrada es única e intransferible. El código QR solo podrá ser validado una vez en el ingreso al evento.",
    "",
    "Nos vemos en Flag Fest.",
    "",
    "Equipo Flag Fest",
  ].join("\n");
}
