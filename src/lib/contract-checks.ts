import { addMonths } from "@/lib/format";
import { periodAmount } from "@/types/contract";
import type { Contract } from "@/types/contract";

const DAY = 86_400_000;
const at = (d: string) => new Date(d + "T00:00:00").getTime();

export function daysUntil(endDate: string, todayISO: string): number {
  return Math.ceil((at(endDate) - at(todayISO)) / DAY);
}

/** Whole months between two ISO dates (dates come from addMonths chains). */
export function monthsBetween(a: string, b: string): number {
  return Math.max(0, Math.round((at(b) - at(a)) / (30.4375 * DAY)));
}

export interface PaymentCycle {
  periodStart: string;
  periodEnd: string;
  months: number;
  amount: number;
}

/**
 * The next payment cycle of a contract, chained after `lastPeriodEnd` (the
 * latest invoice's period end). Returns null when the term is fully invoiced.
 * The last cycle is clamped to the contract end (e.g. a 24-month term paid
 * every 9 months ends with a 6-month cycle). Discounts apply per cycle:
 * "every_period" on all cycles; "this_period" only on the very first one
 * (which is issued by contract creation, not here).
 */
export function nextCycle(
  contract: Pick<
    Contract,
    | "endDate"
    | "paymentMonths"
    | "months"
    | "monthlyRent"
    | "discountValue"
    | "discountKind"
    | "discountScope"
  >,
  lastPeriodEnd: string,
): PaymentCycle | null {
  if (!contract.endDate || lastPeriodEnd >= contract.endDate) return null;
  const cycleMonths = Math.max(1, contract.paymentMonths || contract.months);
  const periodStart = lastPeriodEnd;
  let periodEnd = addMonths(periodStart, cycleMonths);
  if (periodEnd > contract.endDate) periodEnd = contract.endDate;
  const months = Math.max(1, monthsBetween(periodStart, periodEnd));
  const discount =
    contract.discountScope === "every_period" ? contract.discountValue : 0;
  return {
    periodStart,
    periodEnd,
    months,
    amount: periodAmount(
      contract.monthlyRent,
      months,
      discount,
      contract.discountKind,
    ),
  };
}

export interface ContractChecks {
  expiringSoon: Contract[]; // active, ends within the next 30 days
  dueRenewal: Contract[]; // active, term ended, endAction = auto_renew
  dueExpiry: Contract[]; // active, term ended, endAction = terminate
}

export function categorizeContracts(
  contracts: Contract[],
  todayISO: string,
  windowDays = 30,
): ContractChecks {
  const today = at(todayISO);
  const horizon = today + windowDays * DAY;
  const out: ContractChecks = {
    expiringSoon: [],
    dueRenewal: [],
    dueExpiry: [],
  };
  for (const c of contracts) {
    if (c.status !== "active" || !c.endDate) continue;
    const end = at(c.endDate);
    if (end <= today) {
      if (c.endAction === "auto_renew") out.dueRenewal.push(c);
      else out.dueExpiry.push(c);
    } else if (end <= horizon) {
      out.expiringSoon.push(c);
    }
  }
  return out;
}
