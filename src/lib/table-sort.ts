import type { Client, ClientStatus } from "@/types/client";
import type { ActivityLogEntry, ActivityType } from "@/types/activity";
import type { OfficeStatus } from "@/types/office";
import { statusOf, sortClientsByPriority } from "@/lib/client-status";

export type SortDirection = "asc" | "desc";

export function nextSortDirection(
  activeKey: string,
  nextKey: string,
  currentDirection: SortDirection,
): SortDirection {
  if (activeKey !== nextKey) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function compareDates(
  a: string | null | undefined,
  b: string | null | undefined,
  emptyLast = true,
): number {
  const da = a?.trim() || "";
  const db = b?.trim() || "";
  if (!da && !db) return 0;
  if (!da) return emptyLast ? 1 : -1;
  if (!db) return emptyLast ? -1 : 1;
  return da.localeCompare(db);
}

const STATUS_ORDER: Record<ClientStatus, number> = {
  overdue: 0,
  pending: 1,
  sent: 2,
  paid: 3,
};

const OFFICE_STATUS_ORDER: Record<OfficeStatus, number> = {
  rented: 0,
  unrented: 1,
  restricted: 2,
};

const ACTIVITY_TYPE_ORDER: Record<ActivityType, number> = {
  paid: 0,
  invoice: 1,
  receipt: 2,
  wa: 3,
  email: 4,
  created: 5,
};

export function parseOfficeNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return Number.MAX_SAFE_INTEGER;
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export type ClientSortKey =
  | "priority"
  | "name"
  | "company"
  | "office"
  | "rentedBy"
  | "amount"
  | "dueDate"
  | "status";

export type ContractSortKey =
  | "priority"
  | "name"
  | "company"
  | "crExpiry"
  | "joinDate"
  | "dueDate"
  | "amount"
  | "status";

export type OfficeSortKey = "no" | "status" | "company";

export type ActivitySortKey = "date" | "type" | "amount";

export function sortClientsByColumn(
  clients: Client[],
  sortKey: ClientSortKey,
  direction: SortDirection,
): Client[] {
  if (sortKey === "priority") return sortClientsByPriority(clients);

  const sorted = [...clients].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = compareStrings(a.name, b.name);
        break;
      case "company":
        cmp = compareStrings(a.company, b.company);
        break;
      case "office":
        cmp =
          parseOfficeNumber(a.office) - parseOfficeNumber(b.office) ||
          compareStrings(a.office, b.office);
        break;
      case "rentedBy":
        cmp = compareStrings(a.rentedBy, b.rentedBy);
        break;
      case "amount":
        cmp = compareNumbers(a.amount, b.amount);
        break;
      case "dueDate":
        cmp = compareDates(a.dueDate, b.dueDate);
        break;
      case "status":
        cmp =
          (STATUS_ORDER[statusOf(a)] ?? 9) - (STATUS_ORDER[statusOf(b)] ?? 9);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });

  return sorted;
}

export function sortContractsByColumn(
  clients: Client[],
  sortKey: ContractSortKey,
  direction: SortDirection,
): Client[] {
  if (sortKey === "priority") return sortClientsByPriority(clients);

  const sorted = [...clients].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = compareStrings(a.name, b.name);
        break;
      case "company":
        cmp = compareStrings(a.company, b.company);
        break;
      case "crExpiry":
        cmp = compareDates(a.crExpiry, b.crExpiry);
        break;
      case "joinDate":
        cmp = compareDates(a.joinDate, b.joinDate);
        break;
      case "dueDate":
        cmp = compareDates(a.dueDate, b.dueDate);
        break;
      case "amount":
        cmp = compareNumbers(a.amount, b.amount);
        break;
      case "status":
        cmp =
          (STATUS_ORDER[statusOf(a)] ?? 9) - (STATUS_ORDER[statusOf(b)] ?? 9);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });

  return sorted;
}

export function sortOfficeRows<T extends { no: string; status: OfficeStatus; company: string }>(
  rows: T[],
  sortKey: OfficeSortKey,
  direction: SortDirection,
): T[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "no":
        cmp =
          parseOfficeNumber(a.no) - parseOfficeNumber(b.no) ||
          compareStrings(a.no, b.no);
        break;
      case "status":
        cmp = OFFICE_STATUS_ORDER[a.status] - OFFICE_STATUS_ORDER[b.status];
        break;
      case "company":
        cmp = compareStrings(a.company, b.company);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function sortActivityLog(
  entries: ActivityLogEntry[],
  sortKey: ActivitySortKey,
  direction: SortDirection,
): ActivityLogEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = compareDates(b.ts, a.ts, false);
        break;
      case "type":
        cmp = ACTIVITY_TYPE_ORDER[a.type] - ACTIVITY_TYPE_ORDER[b.type];
        break;
      case "amount":
        cmp = compareNumbers(a.amt ?? -1, b.amt ?? -1);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}
