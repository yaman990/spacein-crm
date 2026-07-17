import { summarizeClientBilling } from "@/lib/billing-metrics";
import type { Client } from "@/types/client";
import type { Contract, Invoice } from "@/types/contract";

/**
 * Overlays each client's financial fields with values derived from their
 * live contracts + invoices, so contracts are the single source of truth for
 * everything money-related (dashboard, tables, alerts, comms, invoice
 * printing). Clients with no live contract (e.g. the few no-office ones)
 * keep their stored legacy values.
 *
 * Rules:
 * - Rent is paid IN ADVANCE: each cycle invoice is due on its period START
 *   date. `amount` is the client's TOTAL outstanding across every open invoice
 *   on all their live contracts, and `dueDate` is the earliest one — so a
 *   tenant with two offices, or several cycles behind, reads correctly. Status
 *   stays "sent" if staff already sent the invoice, otherwise "pending"
 *   (overdue computes at read time from dueDate).
 * - If every invoice is paid, the latest paid invoice drives amount/paid-at
 *   and the status is "paid".
 */
export function overlayClientBilling(
  clients: Client[],
  contracts: Contract[],
  invoices: Invoice[],
): Client[] {
  if (contracts.length === 0) return clients;

  const summary = summarizeClientBilling(contracts, invoices);

  return clients.map((client) => {
    const s = summary.get(client.id);
    if (!s) {
      // No contract or invoices at all — don't carry over any imported legacy
      // amount/due date, which otherwise showed as a phantom "overdue" on
      // clients that have no active lease. Money totals come from invoices,
      // so clearing this display value is safe.
      return {
        ...client,
        amount: 0,
        dueDate: "",
        status: client.status === "paid" ? "paid" : "pending",
      };
    }

    if (s.openCount > 0) {
      return {
        ...client,
        office: s.office,
        invoiceType: "rent" as const,
        amount: s.outstanding,
        dueDate: s.earliestDue,
        monthlyRent: s.monthlyRent,
        rentStart: s.rentStart,
        rentEnd: s.rentEnd,
        rentMonths: s.months,
        status: client.status === "sent" ? ("sent" as const) : ("pending" as const),
        paidAt: undefined,
      };
    }
    // everything paid — show the last settled invoice so receipts stay correct
    return {
      ...client,
      office: s.office || client.office,
      invoiceType: "rent" as const,
      amount: s.lastPaidAmount,
      dueDate: "",
      monthlyRent: s.monthlyRent,
      rentMonths: s.months,
      status: "paid" as const,
      paidAt: s.lastPaidAt ?? client.paidAt,
    };
  });
}
