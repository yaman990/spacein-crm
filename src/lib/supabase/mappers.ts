import type { ActivityLogEntry } from "@/types/activity";
import type { Client, ClientInput } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";

export interface ClientRow {
  id: string;
  name: string;
  company: string;
  rank: string;
  office: string;
  phone: string;
  email: string;
  rented_by: string;
  notes: string;
  join_date: string | null;
  due_date: string | null;
  amount: number;
  invoice_type: string;
  rent_months: number | null;
  monthly_rent: number | null;
  rent_start: string | null;
  rent_end: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  cr_expiry: string | null;
}

export interface ActivityRow {
  id: string;
  type: string;
  cid: string | null;
  cname: string | null;
  description: string;
  amt: number | null;
  ts: string;
}

export interface CrmUserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_root?: boolean;
  created_at: string;
}

function emptyToNull(v: string | undefined | null): string | null {
  if (!v) return null;
  return v;
}

export function clientToRow(
  client: Client | (ClientInput & { id: string; createdAt?: string; paidAt?: string }),
): Omit<ClientRow, "created_at"> & { created_at?: string } {
  return {
    id: client.id,
    name: client.name,
    company: client.company ?? "",
    rank: client.rank ?? "",
    office: client.office ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    rented_by: client.rentedBy ?? "",
    notes: client.notes ?? "",
    join_date: emptyToNull(client.joinDate),
    due_date: emptyToNull(client.dueDate),
    amount: Number(client.amount ?? 0),
    invoice_type: client.invoiceType ?? "subscription",
    rent_months: client.rentMonths ?? null,
    monthly_rent: client.monthlyRent ?? null,
    rent_start: emptyToNull(client.rentStart),
    rent_end: emptyToNull(client.rentEnd),
    status: client.status ?? "pending",
    created_at: "createdAt" in client ? client.createdAt : undefined,
    paid_at: "paidAt" in client ? (client.paidAt ?? null) : null,
    cr_expiry: emptyToNull(client.crExpiry),
  };
}

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    rank: row.rank ?? "",
    office: row.office ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    rentedBy: row.rented_by ?? "",
    notes: row.notes ?? "",
    joinDate: row.join_date ?? "",
    dueDate: row.due_date ?? "",
    amount: Number(row.amount ?? 0),
    invoiceType: (row.invoice_type as Client["invoiceType"]) ?? "subscription",
    rentMonths: row.rent_months ?? undefined,
    monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : undefined,
    rentStart: row.rent_start ?? undefined,
    rentEnd: row.rent_end ?? undefined,
    status: row.status as Client["status"],
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    crExpiry: row.cr_expiry ?? undefined,
  };
}

export function rowToActivity(row: ActivityRow): ActivityLogEntry {
  return {
    id: row.id,
    type: row.type as ActivityLogEntry["type"],
    cid: row.cid ?? "",
    cname: row.cname ?? "",
    desc: row.description,
    amt: row.amt != null ? Number(row.amt) : null,
    ts: row.ts,
  };
}

export function overridesToMap(
  rows: { key: string; value: string }[],
): OfficeOverrides {
  const map: OfficeOverrides = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export function mapToOverrideRows(
  overrides: OfficeOverrides,
): { key: string; value: string }[] {
  return Object.entries(overrides).map(([key, value]) => ({ key, value }));
}

export function rowsToFloors(
  rows: { key: string; value: FloorsMap | Record<string, unknown> }[],
  fallback: FloorsMap,
): FloorsMap {
  const floorsRow = rows.find((r) => r.key === "floors");
  if (floorsRow?.value && typeof floorsRow.value === "object") {
    return floorsRow.value as FloorsMap;
  }
  return fallback;
}
