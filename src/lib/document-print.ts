import { buildA4PrintDocument } from "@/lib/invoice-document";
import { buildContractDocument } from "@/lib/contract-document";
import type { Client } from "@/types/client";
import type { Building, Contract } from "@/types/contract";
import type { DocumentType } from "@/lib/invoice-document";

export function openContractPrintWindow(
  contract: Contract,
  client: Client,
  building: Building | null,
) {
  const html = buildContractDocument(contract, client, building);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    alert("Please allow pop-ups to print or save as PDF.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  const triggerPrint = () => printWindow.print();
  if (printWindow.document.readyState === "complete") {
    setTimeout(triggerPrint, 250);
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 250);
  }
}

export function openA4PrintWindow(client: Client, type: DocumentType) {
  const html = buildA4PrintDocument(client, type);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    alert("Please allow pop-ups to print or save as PDF.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  const triggerPrint = () => {
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") {
    setTimeout(triggerPrint, 250);
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 250);
  }
}

export function downloadA4Pdf(client: Client, type: DocumentType) {
  openA4PrintWindow(client, type);
}
