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
 *   date. The headline amount/due date come from the most urgent open
 *   invoice (earliest period start). Status stays "sent" if staff already
 *   sent the invoice, otherwise "pending" (overdue computes at read time).
 * - If every invoice is paid, the latest paid invoice drives amount/paid-at
 *   and the status is "paid".
 */
export function overlayClientBilling(
  clients: Client[],
  contracts: Contract[],
  invoices: Invoice[],
): Client[] {
  if (contracts.length === 0) return clients;

  const liveByClient = new Map<string, Contract[]>();
  for (const c of contracts) {
    if (c.status === "closed") continue;
    const list = liveByClient.get(c.clientId);
    if (list) list.push(c);
    else liveByClient.set(c.clientId, [c]);
  }
  const invoicesByContract = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const list = invoicesByContract.get(inv.contractId);
    if (list) list.push(inv);
    else invoicesByContract.set(inv.contractId, [inv]);
  }

  return clients.map((client) => {
    const live = liveByClient.get(client.id);
    if (!live || live.length === 0) return client;

    let open: { inv: Invoice; contract: Contract } | null = null;
    let lastPaid: { inv: Invoice; contract: Contract } | null = null;
    for (const contract of live) {
      for (const inv of invoicesByContract.get(contract.id) ?? []) {
        if (inv.status === "issued") {
          if (!open || inv.periodStart < open.inv.periodStart)
            open = { inv, contract };
        } else if (!lastPaid || inv.periodEnd > lastPaid.inv.periodEnd) {
          lastPaid = { inv, contract };
        }
      }
    }
    const current = open ?? lastPaid;
    if (!current) return client;

    const { inv, contract } = current;
    return {
      ...client,
      office: contract.officeNo || client.office,
      invoiceType: "rent" as const,
      amount: inv.amount,
      // paid in advance — the invoice is due when its cycle starts
      dueDate: inv.periodStart,
      monthlyRent: contract.monthlyRent,
      rentStart: inv.periodStart,
      rentEnd: inv.periodEnd,
      rentMonths: contract.paymentMonths || contract.months,
      status: open
        ? client.status === "sent"
          ? ("sent" as const)
          : ("pending" as const)
        : ("paid" as const),
      paidAt: open ? undefined : (inv.paidAt ?? client.paidAt),
    };
  });
}
