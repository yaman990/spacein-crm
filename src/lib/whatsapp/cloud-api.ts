import { normalizePhone } from "@/lib/communications";
import {
  getWhatsAppApiVersion,
  isWhatsAppApiConfigured,
} from "@/lib/comms-config";

/** E.164 without + for Meta WhatsApp Cloud API (defaults to Bahrain +973). */
export function toWhatsAppRecipient(phone: string): string {
  let digits = normalizePhone(phone);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("+")) digits = digits.slice(1);

  if (!digits.startsWith("973") && digits.length <= 9) {
    digits = digits.replace(/^0+/, "");
    digits = "973" + digits;
  }

  return digits;
}

export async function sendWhatsAppViaCloudApi(input: {
  phone: string;
  message: string;
}) {
  if (!isWhatsAppApiConfigured()) {
    throw new Error("WhatsApp Cloud API is not configured");
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const version = getWhatsAppApiVersion();
  const to = toWhatsAppRecipient(input.phone);

  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: input.message },
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string; error_user_msg?: string };
    messages?: { id: string }[];
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.error_user_msg ||
        payload.error?.message ||
        `WhatsApp API error (${response.status})`,
    );
  }

  return payload;
}

export function buildWhatsAppDeepLink(phone: string, message: string) {
  const recipient = toWhatsAppRecipient(phone);
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}
