import { bhd, fmtDate, todayFormatted } from "@/lib/format";
import type { Client } from "@/types/client";

export type MessageType = "invoice" | "overdue" | "receipt" | "custom";

const CONTACT_LINE = "Email: Spacein.bh@gmail.com | Tel: 33131226";
const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━";

function waHeader() {
  return `${DIVIDER}
*SPACE IN BUSINESS CENTER*
         CR. 165431-1
${DIVIDER}`;
}

function docNumber(client: Client, type: "invoice" | "receipt") {
  const prefix = type === "receipt" ? "REC-" : "INV-";
  return prefix + client.id.toUpperCase().slice(0, 6);
}

function feeDescription(client: Client) {
  const isRent = client.invoiceType === "rent";
  if (isRent) {
    return `Subscription Fees From ${fmtDate(client.rentStart)} Till ${fmtDate(client.rentEnd)}`;
  }
  return `Subscription Fees${client.dueDate ? " Till " + fmtDate(client.dueDate) : ""}`;
}

function clientBlock(client: Client, prefix: "Received From" | "To") {
  return `*${prefix}:* ${client.name}
${client.company || ""}${client.rank ? "\nCR: " + client.rank : ""}`;
}

export function buildWaMessage(client: Client, type: MessageType, custom?: string) {
  if (type === "custom") return custom || "";
  const invN = docNumber(client, "invoice");
  const recN = docNumber(client, "receipt");
  const desc = feeDescription(client);
  const t = todayFormatted();
  const isRent = client.invoiceType === "rent";

  if (type === "receipt") {
    return `${waHeader()}

*RECEIPT*
Date: ${t}
No: *${recN}*

${clientBlock(client, "Received From")}

${desc}

*PAID IN FULL*
*Amount: ${bhd(client.amount)}*

Thank you.
${CONTACT_LINE}`;
  }

  if (type === "overdue") {
    return `${waHeader()}

*OVERDUE NOTICE*
Date: ${t}
Invoice: *${invN}*

${clientBlock(client, "To")}

Your payment of *${bhd(client.amount)}* was due on *${fmtDate(client.dueDate)}* and has NOT been received.

*Status: OVERDUE*

Please pay immediately.
IBAN: BH34ALSA00806235100100

${CONTACT_LINE}`;
  }

  return `${waHeader()}

*INVOICE*
Date: ${t}
No: *${invN}*

${clientBlock(client, "To")}
Respectful Member at Space IN Business Center

${desc}
${isRent && client.rentMonths && client.rentMonths > 1 ? `Monthly: ${bhd(client.monthlyRent ?? 0)} x ${client.rentMonths} Months\n` : ""}
*TOTAL: ${bhd(client.amount)}*
Due: *${fmtDate(client.dueDate)}*
${DIVIDER}
*BANKING DETAILS*
Bank: Al Salam Bank (ALSA)
Acc: Space IN Business Center WLL
IBAN: BH34ALSA00806235100100
Acc No: 806235100100

${CONTACT_LINE}`;
}

export function buildEmailBody(client: Client, type: MessageType, custom?: string) {
  if (type === "custom") return custom || "";
  const invN = docNumber(client, "invoice");
  const recN = docNumber(client, "receipt");
  const desc = feeDescription(client);
  const t = todayFormatted();
  const isRent = client.invoiceType === "rent";

  if (type === "receipt") {
    return `Dear ${client.name},

════════════════════════
     SPACE IN BUSINESS CENTER
          CR. 165431-1
════════════════════════
RECEIPT
Date:       ${t}
Receipt No: ${recN}
────────────────────────
Received From: ${client.name}${client.company ? "\n               " + client.company : ""}${client.rank ? "\n               CR: " + client.rank : ""}
────────────────────────
Description: ${desc}
Amount Paid: ${bhd(client.amount)}
Status:      PAID IN FULL
════════════════════════

Thank you.

Space IN Business Center
${CONTACT_LINE}`;
  }

  if (type === "overdue") {
    return `Dear ${client.name},

════════════════════════
     SPACE IN BUSINESS CENTER
          CR. 165431-1
════════════════════════
OVERDUE NOTICE
Date:       ${t}
Invoice No: ${invN}
────────────────────────
To: ${client.name}${client.company ? "\n    " + client.company : ""}${client.rank ? "\n    CR: " + client.rank : ""}
────────────────────────
Outstanding: ${bhd(client.amount)}
Original Due: ${fmtDate(client.dueDate)}
Status:      OVERDUE

Please pay immediately.
IBAN: BH34ALSA00806235100100
════════════════════════

Space IN Business Center
${CONTACT_LINE}`;
  }

  return `Dear ${client.name},

════════════════════════
     SPACE IN BUSINESS CENTER
          CR. 165431-1
════════════════════════
INVOICE
Date:       ${t}
Invoice No: ${invN}
────────────────────────
To: ${client.name}${client.company ? "\n    " + client.company : ""}${client.rank ? "\n    CR: " + client.rank : ""}
Respectful Member at Space IN Business Center
Manama Center - Kingdom of Bahrain
────────────────────────
Description: ${desc}${isRent && client.rentMonths && client.rentMonths > 1 ? "\nMonthly: " + bhd(client.monthlyRent ?? 0) + " x " + client.rentMonths + " Months" : ""}
Total Due:   ${bhd(client.amount)}
Due Date:    ${fmtDate(client.dueDate)}
────────────────────────
PAYMENT: Cash or Banking Transfer
Bank:     Al Salam Bank (ALSA)
Acc:      Space IN Business Center WLL
Swift:    ALSABHBM
Acc No:   806235100100
IBAN:     BH34ALSA00806235100100
════════════════════════

Space IN Business Center
${CONTACT_LINE}`;
}

export function buildEmailSubject(client: Client, type: MessageType) {
  const invN = docNumber(client, "invoice");
  const recN = docNumber(client, "receipt");
  if (type === "receipt") return `Receipt ${recN} — Space IN Business Center`;
  if (type === "overdue") return `OVERDUE: Invoice ${invN} — Space IN Business Center`;
  return `Invoice ${invN} — Space IN Business Center`;
}

export function normalizePhone(phone: string) {
  return phone.replace(/[\s\-()+]/g, "");
}

export function defaultMessageType(
  client: Client,
  status: string,
): MessageType {
  if (status === "paid") return "receipt";
  if (status === "overdue") return "overdue";
  return "invoice";
}
