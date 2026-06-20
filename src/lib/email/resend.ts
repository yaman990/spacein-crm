import { Resend } from "resend";
import {
  getResendApiKey,
  getResendFromEmail,
  getResendReplyTo,
  isResendConfigured,
} from "@/lib/comms-config";

export async function sendEmailViaResend(input: {
  to: string;
  subject: string;
  body: string;
  html?: string;
}) {
  if (!isResendConfigured()) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local",
    );
  }

  const resend = new Resend(getResendApiKey());
  const text = input.body;
  const html = input.html ?? buildBrandedEmailHtml(input.subject, text);

  const { data, error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: [input.to.trim()],
    replyTo: getResendReplyTo(),
    subject: input.subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBrandedEmailHtml(subject: string, body: string) {
  const safeBody = escapeHtml(body);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ea;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8dfc8;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#0f0e0b;padding:20px 24px;border-bottom:3px solid #c9a84c;">
              <div style="font-size:22px;font-weight:900;color:#c9a84c;letter-spacing:-0.5px;">SPACEIN</div>
              <div style="font-size:10px;font-weight:700;color:#ffffff;opacity:0.7;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Business Center</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#1a1a1a;font-size:14px;line-height:1.65;">
              <pre style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;white-space:pre-wrap;word-wrap:break-word;">${safeBody}</pre>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#faf8f3;border-top:1px solid #eee5d4;color:#6b6358;font-size:12px;line-height:1.5;">
              Space IN Business Center WLL · CR. 165431-1<br/>
              Manama Center, Kingdom of Bahrain<br/>
              <a href="mailto:Spacein.bh@gmail.com" style="color:#8a7e6e;">Spacein.bh@gmail.com</a> · 33131226
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
