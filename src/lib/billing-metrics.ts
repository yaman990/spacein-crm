import { monthsBetween } from "@/lib/contract-checks";
import type { Contract, Invoice } from "@/types/contract";

// The money figures are computed from the FULL invoice history, never from the
// single cached amount on the client row. Paid invoices are money received;
// "issued" invoices are money owed and stay owed even after the contract is
// closed — only an explicit "void" (write-off) clears them. A contract is
// "live" unless closed; that governs the office/rent shown, not the balance.

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
  // Group ALL of a client's contracts (closed included) so an unpaid balance on
  // a closed contract still surfaces; the office/rent shown comes from a live
  // contract only, so a departed tenant reads with no office.
  const byClient = new Map<string, Contract[]>();
  for (const c of contracts) {
    const arr = byClient.get(c.clientId);
    if (arr) arr.push(c);
    else byClient.set(c.clientId, [c]);
  }
  const invByContract = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const arr = invByContract.get(inv.contractId);
    if (arr) arr.push(inv);
    else invByContract.set(inv.contractId, [inv]);
  }

  const out = new Map<string, ClientBilling>();
  for (const [clientId, all] of byClient) {
    let outstanding = 0;
    let openCount = 0;
    let open: { inv: Invoice; c: Contract } | null = null;
    let lastPaid: Invoice | null = null;
    for (const c of all) {
      for (const inv of invByContract.get(c.id) ?? []) {
        if ((inv.paidAmount ?? 0) > 0) {
          if (!lastPaid || inv.periodEnd > lastPaid.periodEnd) lastPaid = inv;
        }
        if (inv.status === "void") continue; // written off — ignored
        const remaining = Math.max(0, inv.amount - (inv.paidAmount ?? 0));
        if (remaining > 0.0005) {
          outstanding += remaining;
          openCount++;
          if (!open || inv.periodStart < open.inv.periodStart)
            open = { inv, c };
        }
      }
    }
    const liveContracts = all.filter(isLive);
    const primaryLive =
      open && isLive(open.c) ? open.c : liveContracts[0] ?? null;
    out.set(clientId, {
      outstanding,
      openCount,
      earliestDue: open?.inv.periodStart ?? "",
      monthlyRent: primaryLive?.monthlyRent ?? 0,
      rentStart: open?.inv.periodStart ?? "",
      rentEnd: open?.inv.periodEnd ?? "",
      // month count of the actual open cycle, so clamped/short cycles print right
      months: open
        ? Math.max(1, monthsBetween(open.inv.periodStart, open.inv.periodEnd))
        : primaryLive?.paymentMonths || primaryLive?.months || 0,
      // empty when the client has no live contract (they've moved out)
      office: primaryLive?.officeNo ?? "",
      lastPaidAt: lastPaid?.paidAt,
      lastPaidAmount: lastPaid?.paidAmount ?? lastPaid?.amount ?? 0,
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
  let collected = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const inv of invoices) {
    collected += inv.paidAmount ?? 0; // money received (incl. partials)
    if (inv.status === "void") continue;
    // Money owed stays owed even if the contract was closed — only a "void"
    // write-off removes it. Partial payments reduce the remaining balance.
    const remaining = Math.max(0, inv.amount - (inv.paidAmount ?? 0));
    outstanding += remaining;
    if (remaining > 0 && inv.periodStart && inv.periodStart < todayISO)
      overdue += remaining;
  }
  let mrr = 0;
  for (const c of contracts) {
    if (MRR_STATUS.has(c.status)) mrr += Number(c.monthlyRent || 0);
  }
  return { collected, outstanding, overdue, portfolio: collected + outstanding, mrr };
}
