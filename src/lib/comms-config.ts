function stripEnvQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "").trim();
}

function isPlaceholder(value?: string) {
  if (!value?.trim()) return true;
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("your-") ||
    v.includes("xxxxxxxx") ||
    v === "changeme" ||
    v === "placeholder"
  );
}

export function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      !isPlaceholder(process.env.RESEND_API_KEY) &&
      process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

export function isWhatsAppApiConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      !isPlaceholder(process.env.WHATSAPP_ACCESS_TOKEN) &&
      !isPlaceholder(process.env.WHATSAPP_PHONE_NUMBER_ID),
  );
}

export function getWhatsAppApiVersion() {
  return process.env.WHATSAPP_API_VERSION || "v21.0";
}

export function getResendFromEmail() {
  const raw =
    process.env.RESEND_FROM_EMAIL ||
    "Space IN Business Center <noreply@spacein.bh>";
  return stripEnvQuotes(raw);
}

export function getResendReplyTo() {
  const raw = process.env.RESEND_REPLY_TO || "Spacein.bh@gmail.com";
  return stripEnvQuotes(raw);
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}
