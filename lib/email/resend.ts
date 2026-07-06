import "server-only";
import { Resend } from "resend";
import {
  TICKET_EMAIL_SUBJECT,
  ticketEmailHtml,
  ticketEmailText,
  type TicketEmailContent,
} from "./templates";

/**
 * Envío de correos con Resend. SOLO SERVIDOR: lee `RESEND_API_KEY` y
 * `RESEND_FROM_EMAIL`, que nunca deben llegar al cliente.
 */

let client: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en el entorno (nunca en cliente).");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("Falta RESEND_FROM_EMAIL en el entorno.");
  }
  return from;
}

export interface SendTicketEmailParams extends TicketEmailContent {
  to: string;
  pdfBuffer: Buffer;
}

export type SendTicketEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/**
 * Envía el correo con la entrada adjunta en PDF.
 * No lanza: devuelve `{ ok: false, error }` para que el llamador registre
 * el fallo sin perder la entrada ya creada.
 */
export async function sendTicketEmail(
  params: SendTicketEmailParams,
): Promise<SendTicketEmailResult> {
  const content: TicketEmailContent = {
    customerName: params.customerName,
    eventName: params.eventName,
    eventDate: params.eventDate,
    location: params.location,
    color: params.color,
    shortCode: params.shortCode,
  };

  try {
    const { data, error } = await getResend().emails.send({
      from: fromAddress(),
      to: params.to,
      subject: TICKET_EMAIL_SUBJECT,
      html: ticketEmailHtml(content),
      text: ticketEmailText(content),
      attachments: [
        {
          filename: `entrada-${params.shortCode}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      return { ok: false, error: error.message ?? "Error de Resend." };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de envío.";
    return { ok: false, error: message };
  }
}
