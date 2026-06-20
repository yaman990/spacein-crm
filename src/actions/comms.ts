"use server";

import { auth } from "@/lib/auth";
import { sendEmailViaResend } from "@/lib/email/resend";
import { isResendConfigured, isWhatsAppApiConfigured } from "@/lib/comms-config";
import {
  buildWhatsAppDeepLink,
  sendWhatsAppViaCloudApi,
} from "@/lib/whatsapp/cloud-api";
import { recordCommunicationAction } from "@/actions/crm";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function sendClientEmailAction(input: {
  clientId: string;
  clientName: string;
  to: string;
  subject: string;
  body: string;
  messageType: string;
}): Promise<{ via: "resend" | "manual" }> {
  await requireSession();

  if (!input.to?.trim()) throw new Error("Recipient email is required");

  if (isResendConfigured()) {
    await sendEmailViaResend({
      to: input.to.trim(),
      subject: input.subject,
      body: input.body,
    });
    await recordCommunicationAction(
      input.clientId,
      "email",
      input.messageType,
    );
    return { via: "resend" };
  }

  await recordCommunicationAction(input.clientId, "email", input.messageType);
  return { via: "manual" };
}

export async function sendClientWhatsAppAction(input: {
  clientId: string;
  clientName: string;
  phone: string;
  message: string;
  messageType: string;
}): Promise<{ via: "cloud_api" | "wa_me"; link?: string }> {
  await requireSession();

  if (!input.phone?.trim()) throw new Error("Phone number is required");

  if (isWhatsAppApiConfigured()) {
    await sendWhatsAppViaCloudApi({
      phone: input.phone,
      message: input.message,
    });
    await recordCommunicationAction(input.clientId, "wa", input.messageType);
    return { via: "cloud_api" };
  }

  const link = buildWhatsAppDeepLink(input.phone, input.message);
  await recordCommunicationAction(input.clientId, "wa", input.messageType);
  return { via: "wa_me", link };
}

export async function getCommsCapabilitiesAction(): Promise<{
  resend: boolean;
  whatsappApi: boolean;
}> {
  await requireSession();
  return {
    resend: isResendConfigured(),
    whatsappApi: isWhatsAppApiConfigured(),
  };
}
