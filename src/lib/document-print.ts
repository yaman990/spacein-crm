import {
  buildA4PrintDocument,
  buildInvoiceRecordDocument,
} from "@/lib/invoice-document";
import { buildContractDocument } from "@/lib/contract-document";
import type { Client } from "@/types/client";
import type { Building, Contract, Invoice } from "@/types/contract";
import type { DocumentType } from "@/lib/invoice-document";

/**
 * Prints an A4 HTML document through a hidden same-origin iframe. Unlike
 * window.open, this needs no pop-up permission: the browser's print dialog
 * opens directly, where the user can print or choose "Save as PDF".
 * (The previous window.open("", "_blank", "noopener") approach returned null
 * because of the noopener flag, leaving a blank tab that never got content.)
 */
export function printHtmlA4(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.srcdoc = html;

  const cleanup = () => setTimeout(() => iframe.remove(), 500);

  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", cleanup, { once: true });
    // let fonts/layout settle before the print snapshot
    setTimeout(() => {
      win.focus();
      win.print();
    }, 250);
    // fallback cleanup in case afterprint never fires
    setTimeout(cleanup, 120_000);
  });

  document.body.appendChild(iframe);
}

export function openContractPrintWindow(
  contract: Contract,
  client: Client,
  building: Building | null,
) {
  printHtmlA4(buildContractDocument(contract, client, building));
}

export function openA4PrintWindow(client: Client, type: DocumentType) {
  printHtmlA4(buildA4PrintDocument(client, type));
}

export function downloadA4Pdf(client: Client, type: DocumentType) {
  openA4PrintWindow(client, type);
}

export function openInvoiceRecordPrint(
  invoice: Invoice,
  contract: Contract | undefined,
  client: Client,
) {
  printHtmlA4(buildInvoiceRecordDocument(invoice, contract, client));
}
