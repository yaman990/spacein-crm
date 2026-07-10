import { monthsBetween } from "@/lib/contract-checks";
import type { Contract, Invoice } from "@/types/contract";

// The money figures are computed from the FULL invoice history, never from the
// single cached amount on the client row. A contract is "live" unless closed;
// its invoices are what the tenant has been billed. Paid invoices are money
// received; issued (unpaid) invoices are money owed.

const isLive = (c: Contract) => c.status !== "closed";
const MRR_STATUS = new Set(["active", "reserved", "renewal_await_payment"]);

export interface ClientBilling {
  /** Sum of every unpaid invoice across the client's live contracts. */
  outstanding: number;
  openCount: number;
  /** Earliest unpaid period start ("" when nothing is open). */
  earliestDue: string;
  monthlyRent: number;
  rentStart: string;
  rentEnd: string;
  months: number;
  office: string;
  lastPaidAt?: string;
  lastPaidAmount: number;
}

/**
 * Per-client billing rolled up across ALL of a client's live contracts, so a
 * tenant with two offices (or several cycles behind) reports one correct total
 * instead of a single cycle.
 */
export function summarizeClientBilling(
  contracts: Contract[],
  invoices: Invoice[],
): Map<string, ClientBilling> {
  const liveByClient = new Map<string, Contract[]>();
  for (const c of contracts) {
    if (!isLive(c)) continue;
    const arr = liveByClient.get(c.clientId);
    if (arr) arr.push(c);
    else liveByClient.set(c.clientId, [c]);
  }
  const invByContract = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const arr = invByContract.get(inv.contractId);
    if (arr) arr.push(inv);
    else invByContract.set(inv.contractId, [inv]);
  }

  const out = new Map<string, ClientBilling>();
  for (const [clientId, live] of liveByClient) {
    let outstanding = 0;
    let openCount = 0;
    let open: { inv: Invoice; c: Contract } | null = null;
    let lastPaid: Invoice | null = null;
    for (const c of live) {
      for (const inv of invByContract.get(c.id) ?? []) {
        if (inv.status === "issued") {
          outstanding += inv.amount;
          openCount++;
          if (!open || inv.periodStart < open.inv.periodStart)
            open = { inv, c };
        } else if (!lastPaid || inv.periodEnd > lastPaid.periodEnd) {
          lastPaid = inv;
        }
      }
    }
    const primary = open?.c ?? live[0];
    out.set(clientId, {
      outstanding,
      openCount,
      earliestDue: open?.inv.periodStart ?? "",
      monthlyRent: primary.monthlyRent,
      rentStart: open?.inv.periodStart ?? "",
      rentEnd: open?.inv.periodEnd ?? "",
      // month count of the actual open cycle, so clamped/short cycles print right
      months: open
        ? Math.max(1, monthsBetween(open.inv.periodStart, open.inv.periodEnd))
        : primary.paymentMonths || primary.months,
      office: primary.officeNo ?? "",
      lastPaidAt: lastPaid?.paidAt,
      lastPaidAmount: lastPaid?.amount ?? 0,
    });
  }
  return out;
}

export interface PortfolioTotals {
  /** Money received: every paid invoice, ever. */
  collected: number;
  /** Money owed: unpaid invoices on live contracts. */
  outstanding: number;
  /** Owed and already started (period start in the past). */
  overdue: number;
  /** Collected + outstanding — total billed to date. */
  portfolio: number;
  /** Monthly recurring revenue: rent of every active/reserved/renewing contract. */
  mrr: number;
}

export function portfolioTotals(
  contracts: Contract[],
  invoices: Invoice[],
  todayISO: string,
): PortfolioTotals {
  const liveIds = new Set(contracts.filter(isLive).map((c) => c.id));
  let collected = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const inv of invoices) {
    if (inv.status === "paid") {
      collected += inv.amount;
      continue;
    }
    if (!liveIds.has(inv.contractId)) continue; // unpaid on a closed contract
    outstanding += inv.amount;
    if (inv.periodStart && inv.periodStart < todayISO) overdue += inv.amount;
  }
  let mrr = 0;
  for (const c of contracts) {
    if (MRR_STATUS.has(c.status)) mrr += Number(c.monthlyRent || 0);
  }
  return { collected, outstanding, overdue, portfolio: collected + outstanding, mrr };
}
