import type { Contract } from "@/types/contract";

const DAY = 86_400_000;
const at = (d: string) => new Date(d + "T00:00:00").getTime();

export function daysUntil(endDate: string, todayISO: string): number {
  return Math.ceil((at(endDate) - at(todayISO)) / DAY);
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
