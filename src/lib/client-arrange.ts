import { statusOf, daysUntilDue } from "@/lib/client-status";
import { crRegistryState } from "@/lib/cr-registry";
import type { Client } from "@/types/client";
import type { Contract } from "@/types/contract";

// A single "arrange by" filter spanning the three facts an office manager
// chases, each read from its true source:
//   CR      → the client's registry status + expiry (client fact)
//   Payment → open invoices, surfaced on the client via the billing overlay
//   Lease   → the contract's real end date + status (contract fact)
export type ArrangeFilter =
  | "all"
  | "cr-expired"
  | "cr-soon"
  | "cr-none"
  | "pay-overdue"
  | "pay-soon"
  | "pay-clear"
  | "lease-soon"
  | "lease-expired";

export interface LeaseInfo {
  soonestEnd: string | null; // earliest end date among the client's live leases
  expired: boolean; // has a lease already ended / marked expired
}

/** Rolls each client's live contracts into their soonest lease end + expiry. */
export function buildLeaseIndex(contracts: Contract[]): Map<string, LeaseInfo> {
  const today = new Date().toISOString().slice(0, 10);
  const m = new Map<string, LeaseInfo>();
  for (const c of contracts) {
    if (c.status === "closed") continue;
    const cur = m.get(c.clientId) ?? { soonestEnd: null, expired: false };
    if (c.status === "expired" || (c.endDate && c.endDate < today && c.status === "active")) {
      cur.expired = true;
    }
    if (
      (c.status === "active" || c.status === "renewal_await_payment") &&
      c.endDate
    ) {
      if (!cur.soonestEnd || c.endDate < cur.soonestEnd) cur.soonestEnd = c.endDate;
    }
    m.set(c.clientId, cur);
  }
  return m;
}

function daysFromToday(iso: string): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso + "T00:00:00").getTime() - t.getTime()) / 86400000);
}

export function matchesArrangeFilter(
  client: Client,
  filter: ArrangeFilter,
  lease?: LeaseInfo,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "cr-expired": {
      const s = crRegistryState(client);
      return s.level === "expired" || s.level === "inactive";
    }
    case "cr-soon":
      return crRegistryState(client).level === "expiring";
    case "cr-none":
      return crRegistryState(client).level === "none";
    case "pay-overdue":
      return statusOf(client) === "overdue";
    case "pay-soon": {
      const s = statusOf(client);
      if (s === "paid" || s === "overdue") return false;
      const d = daysUntilDue(client);
      return d !== null && d >= 0 && d <= 30;
    }
    case "pay-clear":
      return statusOf(client) === "paid";
    case "lease-soon": {
      if (!lease?.soonestEnd) return false;
      const d = daysFromToday(lease.soonestEnd);
      return d >= 0 && d <= 60;
    }
    case "lease-expired":
      return !!lease?.expired;
    default:
      return true;
  }
}

export function arrangeClients(
  clients: Client[],
  filter: ArrangeFilter,
  leaseIndex?: Map<string, LeaseInfo>,
): Client[] {
  if (filter === "all") return clients;
  return clients.filter((c) =>
    matchesArrangeFilter(c, filter, leaseIndex?.get(c.id)),
  );
}

export const ARRANGE_GROUPS: {
  label: string;
  options: { value: ArrangeFilter; label: string }[];
}[] = [
  {
    label: "Commercial registration",
    options: [
      { value: "cr-expired", label: "CR expired / suspended" },
      { value: "cr-soon", label: "CR expiring ≤60 days" },
      { value: "cr-none", label: "No CR on file" },
    ],
  },
  {
    label: "Payment",
    options: [
      { value: "pay-overdue", label: "Payment overdue" },
      { value: "pay-soon", label: "Payment due ≤30 days" },
      { value: "pay-clear", label: "Paid up" },
    ],
  },
  {
    label: "Lease",
    options: [
      { value: "lease-soon", label: "Lease ending ≤60 days" },
      { value: "lease-expired", label: "Lease expired" },
    ],
  },
];
