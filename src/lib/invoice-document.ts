import { bhd, fmtDate, todayFormatted } from "@/lib/format";
import type { Client } from "@/types/client";
import type { Contract, Invoice } from "@/types/contract";

export type DocumentType = "invoice" | "receipt";

export interface InvoiceDocumentData {
  type: DocumentType;
  docNumber: string;
  dateStr: string;
  descText: string;
  amtText: string;
  isRent: boolean;
  isReceipt: boolean;
}

export function buildInvoiceDocumentData(
  client: Client,
  type: DocumentType,
): InvoiceDocumentData {
  const isReceipt = type === "receipt";
  const docNumber =
    (isReceipt ? "REC-" : "INV-") + client.id.toUpperCase().slice(0, 6);
  const dateStr = todayFormatted();
  const paidD = client.paidAt
    ? fmtDate(client.paidAt.slice(0, 10))
    : dateStr;
  const isRent = client.invoiceType === "rent";

  let descText = isRent
    ? `Subscription Fees From ${fmtDate(client.rentStart)} Till ${fmtDate(client.rentEnd)}`
    : `Subscription Fees From ${dateStr} Till ${fmtDate(client.dueDate)}`;
  if (client.notes) descText += " — " + client.notes;

  return {
    type,
    docNumber,
    dateStr: isReceipt ? paidD : dateStr,
    descText,
    amtText: bhd(client.amount),
    isRent,
    isReceipt,
  };
}

const STAMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="115" height="115" viewBox="0 0 130 130" aria-hidden="true">
  <circle cx="65" cy="65" r="61" fill="none" stroke="#1a56b0" stroke-width="2"/>
  <circle cx="65" cy="65" r="42" fill="none" stroke="#1a56b0" stroke-width="1.5"/>
  <path id="arcTop" fill="none" d="M 10,65 A 55,55 0 0,1 120,65"/>
  <text font-family="Arial,sans-serif" font-size="9.5" font-weight="800" fill="#1a56b0" letter-spacing="3.2">
    <textPath href="#arcTop" startOffset="4%">SPACE IN BUSINESS CENTER</textPath>
  </text>
  <path id="arcBot" fill="none" d="M 16,72 A 55,55 0 0,0 114,72"/>
  <text font-family="Arial,sans-serif" font-size="9.5" font-weight="800" fill="#1a56b0" letter-spacing="4">
    <textPath href="#arcBot" startOffset="32%">WLL</textPath>
  </text>
  <line x1="35" y1="68" x2="95" y2="68" stroke="#1a56b0" stroke-width="1.4"/>
  <text x="65" y="62" text-anchor="middle" font-family="Arial,sans-serif" font-size="10.5" font-weight="800" fill="#1a56b0">CR.165431-1</text>
</svg>`;

const RENTED_BY_USER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderInvoiceDocumentHtml(
  client: Client,
  data: InvoiceDocumentData,
): string {
  const title = data.isReceipt ? "Receipt" : "Invoice";
  const toLine = [
    client.name,
    client.company ? " — " + client.company : "",
    client.rank ? " -CR. No. " + client.rank : "",
  ].join("");

  const rentBreakdown =
    data.isRent && client.rentMonths && client.rentMonths > 1
      ? `<br><small style="color:#555;font-size:10px;">Monthly: ${esc(bhd(client.monthlyRent ?? 0))} x ${client.rentMonths} Months</small>`
      : "";

  const banking = !data.isReceipt
    ? `
    <div class="center bold underline" style="margin:16px 0 8px;">Payments Methods: Cash or Banking Transfer</div>
    <div class="bold underline" style="margin-bottom:6px;">Banking Transfer Details:</div>
    <div class="bank-row"><span class="bank-label">Bank Name:</span><strong>Al Salam Bank (ALSA)</strong></div>
    <div class="bank-row"><span class="bank-label">Account Name:</span><strong>Space IN Business Center WLL</strong></div>
    <div class="bank-row"><span class="bank-label">Swift Code:</span><strong>ALSABHBM</strong></div>
    <div class="bank-row"><span class="bank-label">Account Number:</span><strong>806235100100</strong></div>
    <div class="bank-row"><span class="bank-label">IBAN:</span><strong>BH34ALSA00806235100100</strong></div>`
    : `<div class="center muted" style="margin-top:12px;font-size:11px;">Payment confirmed on ${esc(data.dateStr)}. Thank you!</div>`;

  const paidStamp = data.isReceipt
    ? `<div class="center" style="margin:12px 0;"><span class="paid-stamp">PAID</span></div>`
    : "";

  const rentedBy = client.rentedBy
    ? `<div class="rented-by">${RENTED_BY_USER_ICON}<span><strong>Rented by:</strong> ${esc(client.rentedBy)}</span></div>`
    : "";

  return `
    <div class="doc-page">
      <div class="doc-header">
        <div class="brand">
          <div class="brand-name">SPACEIN</div>
          <div class="brand-sub">BUSINESS CENTER</div>
          <div class="brand-cr">165431-1</div>
        </div>
        <div class="header-line"><hr/></div>
      </div>

      <div class="doc-title-block center">
        <h1 class="doc-title">${title}</h1>
        <div class="doc-date">Date: ${esc(data.dateStr)}</div>
        <div class="doc-number">${esc(data.docNumber)}</div>
      </div>

      ${paidStamp}

      <div class="recipient">
        <div><strong>To: ${esc(toLine)}</strong></div>
        <div>Respectful Member at Space IN Business Center</div>
        <div>Manama Center - Kingdom of Bahrain</div>
        ${client.phone ? `<div>Tel: ${esc(client.phone)}</div>` : ""}
        ${client.email ? `<div>Email: ${esc(client.email)}</div>` : ""}
        ${client.office ? `<div>Office No: <strong>${esc(client.office)}</strong></div>` : ""}
        ${client.joinDate ? `<div>Member Since: <strong>${fmtDate(client.joinDate)}</strong></div>` : ""}
      </div>

      ${rentedBy}

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:40px;">Sr</th>
            <th>Description</th>
            <th style="width:120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td class="center">${esc(data.descText)}${rentBreakdown}</td>
            <td class="center bold">${esc(data.amtText)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2" class="center bold">TOTAL</td>
            <td class="center bold">${esc(data.amtText)}</td>
          </tr>
        </tbody>
      </table>

      ${banking}

      <div class="stamp-wrap">${STAMP_SVG}</div>
    </div>`;
}

export const A4_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 20mm 20mm;
    margin: 0 auto;
    background: #fff;
  }
  .doc-header { display: flex; align-items: flex-start; margin-bottom: 4px; }
  .brand { min-width: 190px; }
  .brand-name {
    font-family: "Arial Black", Impact, sans-serif;
    font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -0.5px;
  }
  .brand-sub {
    font-size: 9.5px; font-weight: 900; letter-spacing: 2.5px;
    text-transform: uppercase; margin-top: 2px;
  }
  .brand-cr { font-size: 9.5px; color: #444; margin-top: 1px; }
  .header-line { flex: 1; padding: 12px 0 0 18px; }
  .header-line hr { border: none; border-top: 1.5px solid #000; margin: 0; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .underline { text-decoration: underline; }
  .muted { color: #555; }
  .doc-title-block { margin: 18px 0 10px; }
  .doc-title {
    font-size: 20px; font-weight: 700; text-decoration: underline;
    display: inline-block; margin: 0;
  }
  .doc-date { font-size: 12px; font-weight: 700; color: #c0392b; margin-top: 4px; }
  .doc-number { font-size: 10px; color: #888; margin-top: 2px; }
  .paid-stamp {
    display: inline-block; border: 3px solid #1a7a4a; color: #1a7a4a;
    font-size: 24px; font-weight: 900; padding: 3px 20px; border-radius: 3px;
    transform: rotate(-7deg); letter-spacing: 2px;
  }
  .recipient { margin: 12px 0; font-size: 12px; line-height: 1.8; }
  .rented-by {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #fff8e1; border-left: 3px solid #f9a825;
    padding: 6px 10px; margin-bottom: 10px; font-size: 11px;
    border-radius: 0 5px 5px 0;
  }
  .rented-by svg { flex-shrink: 0; }
  .items-table {
    width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;
  }
  .items-table th {
    background: #0f0e0b; color: #fff; padding: 7px 9px; font-size: 11px;
    border: 1px solid #bbb; text-align: center;
  }
  .items-table td { padding: 9px; border: 1px solid #bbb; }
  .total-row { background: #f5f5f5; }
  .bank-row { font-size: 12px; line-height: 1.85; }
  .bank-label { display: inline-block; width: 155px; color: #333; }
  .stamp-wrap { display: flex; justify-content: flex-end; margin-top: 16px; margin-right: 10px; }
  @media screen {
    body { background: #e8e8e8; padding: 16px 0; }
    .doc-page { box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
  }
  @media print {
    html, body { background: #fff; }
    .doc-page {
      width: 210mm; min-height: 297mm;
      box-shadow: none; page-break-after: avoid;
    }
  }
`;

export function buildA4PrintDocument(
  client: Client,
  type: DocumentType,
): string {
  const data = buildInvoiceDocumentData(client, type);
  const body = renderInvoiceDocumentHtml(client, data);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${data.isReceipt ? "Receipt" : "Invoice"} ${esc(data.docNumber)} — ${esc(client.name)}</title>
  <style>${A4_PRINT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

/**
 * A4 invoice for ONE specific invoice record (a single billing cycle), with its
 * own period, office and amount — used from the Invoices page. Fully-paid ones
 * print with a PAID stamp; partial ones note the amount still due.
 */
export function buildInvoiceRecordDocument(
  invoice: Invoice,
  contract: Contract | undefined,
  client: Client,
): string {
  const paid = invoice.paidAmount || 0;
  const remaining = Math.max(0, invoice.amount - paid);
  const fullyPaid = invoice.status !== "void" && remaining <= 0.0005;
  const office = contract?.officeNo ?? client.office;

  const docClient: Client = {
    ...client,
    office,
    invoiceType: "rent",
    amount: invoice.amount,
    monthlyRent: contract?.monthlyRent ?? client.monthlyRent,
    rentStart: invoice.periodStart,
    rentEnd: invoice.periodEnd,
    rentMonths: contract?.paymentMonths || contract?.months || client.rentMonths,
    paidAt: fullyPaid ? invoice.paidAt : undefined,
  };

  const note =
    invoice.status === "void"
      ? " — WRITTEN OFF"
      : fullyPaid
        ? ""
        : paid > 0
          ? ` — Paid ${bhd(paid)}, Remaining ${bhd(remaining)}`
          : "";

  const data: InvoiceDocumentData = {
    type: fullyPaid ? "receipt" : "invoice",
    docNumber: `INV-${(contract?.contractNo || invoice.id).toString().toUpperCase().slice(0, 12)}`,
    dateStr: fullyPaid
      ? fmtDate((invoice.paidAt || invoice.issuedAt || "").slice(0, 10))
      : fmtDate((invoice.issuedAt || "").slice(0, 10)),
    descText: `Office Rent${office ? ` — Office ${office}` : ""} · ${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}${note}`,
    amtText: bhd(invoice.amount),
    isRent: true,
    isReceipt: fullyPaid,
  };

  const body = renderInvoiceDocumentHtml(docClient, data);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${data.isReceipt ? "Receipt" : "Invoice"} ${esc(data.docNumber)} — ${esc(client.name)}</title>
  <style>${A4_PRINT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}
