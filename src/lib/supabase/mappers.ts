import type { ActivityLogEntry } from "@/types/activity";
import type { Client, ClientInput, ClientType } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";
import type {
  Building,
  Contract,
  Invoice,
  OfficeDetails,
  Payment,
} from "@/types/contract";

export interface ClientRow {
  id: string;
  name: string;
  company: string;
  type?: string;
  authorized_name?: string | null;
  authorized_cpr?: string | null;
  authorized_nationality?: string | null;
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
  cr_status?: string | null;
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
    type: client.type ?? "commercial",
    authorized_name: client.authorizedName ?? "",
    authorized_cpr: client.authorizedCpr ?? "",
    authorized_nationality: client.authorizedNationality ?? "",
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
    cr_status: emptyToNull(client.crStatus),
  };
}

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    type: (row.type as ClientType) ?? "commercial",
    authorizedName: row.authorized_name ?? "",
    authorizedCpr: row.authorized_cpr ?? "",
    authorizedNationality: row.authorized_nationality ?? "",
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
    crStatus: row.cr_status ?? undefined,
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

// --- Contracts / Invoices / Office details / Building -------------------
const num = (v: unknown): number | undefined =>
  v == null ? undefined : Number(v);

export interface ContractRow {
  id: string;
  contract_no: string;
  client_id: string;
  floor_key: string | null;
  office_no: string | null;
  client_type: string;
  monthly_rent: number;
  months: number;
  payment_months?: number | null;
  renewal_months: number;
  discount_value: number;
  discount_kind: string;
  discount_scope: string;
  start_date: string | null;
  end_date: string | null;
  end_action: string;
  status: string;
  renewal_count: number;
  created_by_staff_id: string | null;
  created_at: string;
}

export function rowToContract(row: ContractRow): Contract {
  return {
    id: row.id,
    contractNo: row.contract_no ?? "",
    clientId: row.client_id,
    floorKey: row.floor_key ?? undefined,
    officeNo: row.office_no ?? undefined,
    clientType: row.client_type as Contract["clientType"],
    monthlyRent: Number(row.monthly_rent ?? 0),
    months: Number(row.months ?? 0),
    paymentMonths: Number(row.payment_months ?? row.months ?? 0),
    renewalMonths: Number(row.renewal_months ?? 0),
    discountValue: Number(row.discount_value ?? 0),
    discountKind: row.discount_kind as Contract["discountKind"],
    discountScope: row.discount_scope as Contract["discountScope"],
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    endAction: row.end_action as Contract["endAction"],
    status: row.status as Contract["status"],
    renewalCount: Number(row.renewal_count ?? 0),
    createdByStaffId: row.created_by_staff_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function contractToRow(
  c: Contract,
): Omit<ContractRow, "created_at"> & { created_at?: string } {
  return {
    id: c.id,
    contract_no: c.contractNo,
    client_id: c.clientId,
    floor_key: c.floorKey ?? null,
    office_no: c.officeNo ?? null,
    client_type: c.clientType,
    monthly_rent: Number(c.monthlyRent ?? 0),
    months: Number(c.months ?? 0),
    payment_months: Number(c.paymentMonths ?? c.months ?? 0),
    renewal_months: Number(c.renewalMonths ?? 0),
    discount_value: Number(c.discountValue ?? 0),
    discount_kind: c.discountKind,
    discount_scope: c.discountScope,
    start_date: emptyToNull(c.startDate),
    end_date: emptyToNull(c.endDate),
    end_action: c.endAction,
    status: c.status,
    renewal_count: Number(c.renewalCount ?? 0),
    created_by_staff_id: c.createdByStaffId ?? null,
  };
}

export interface InvoiceRow {
  id: string;
  contract_id: string;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  paid_amount?: number | null;
  status: string;
  issued_at: string;
  paid_at: string | null;
  paid_by_staff_id: string | null;
  receipt_path: string | null;
}

export function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    contractId: row.contract_id,
    periodStart: row.period_start ?? "",
    periodEnd: row.period_end ?? "",
    amount: Number(row.amount ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    status: row.status as Invoice["status"],
    issuedAt: row.issued_at,
    paidAt: row.paid_at ?? undefined,
    paidByStaffId: row.paid_by_staff_id ?? undefined,
    receiptPath: row.receipt_path ?? undefined,
  };
}

export function invoiceToRow(
  inv: Omit<Invoice, "paidAmount"> & { paidAmount?: number },
): Omit<InvoiceRow, "issued_at"> & { issued_at?: string } {
  return {
    id: inv.id,
    contract_id: inv.contractId,
    period_start: emptyToNull(inv.periodStart),
    period_end: emptyToNull(inv.periodEnd),
    amount: Number(inv.amount ?? 0),
    paid_amount: Number(inv.paidAmount ?? 0),
    status: inv.status,
    paid_at: inv.paidAt ?? null,
    paid_by_staff_id: inv.paidByStaffId ?? null,
    receipt_path: inv.receiptPath ?? null,
  };
}

export interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string;
  paid_by_staff_id: string | null;
  receipt_path: string | null;
  note: string | null;
}

export function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount ?? 0),
    paidAt: row.paid_at,
    paidByStaffId: row.paid_by_staff_id ?? undefined,
    receiptPath: row.receipt_path ?? undefined,
    note: row.note ?? undefined,
  };
}

export interface OfficeDetailsRow {
  floor_key: string;
  office_no: string;
  area_sqm: number | null;
  rate_3: number | null;
  rate_6: number | null;
  rate_9: number | null;
  rate_12: number | null;
  multi_tenant: boolean;
  capacity: number;
}

export function rowToOfficeDetails(row: OfficeDetailsRow): OfficeDetails {
  return {
    floorKey: row.floor_key,
    officeNo: row.office_no,
    areaSqm: num(row.area_sqm),
    rate3: num(row.rate_3),
    rate6: num(row.rate_6),
    rate9: num(row.rate_9),
    rate12: num(row.rate_12),
    multiTenant: Boolean(row.multi_tenant),
    capacity: Number(row.capacity ?? 1),
  };
}

export function officeDetailsToRow(d: OfficeDetails): OfficeDetailsRow {
  return {
    floor_key: d.floorKey,
    office_no: d.officeNo,
    area_sqm: d.areaSqm ?? null,
    rate_3: d.rate3 ?? null,
    rate_6: d.rate6 ?? null,
    rate_9: d.rate9 ?? null,
    rate_12: d.rate12 ?? null,
    multi_tenant: d.multiTenant,
    capacity: d.capacity ?? 1,
  };
}

export interface BuildingRow {
  id: string;
  name: string;
  building_no: string;
  road_no: string;
  block_no: string;
  city: string;
  country: string;
}

export function rowToBuilding(row: BuildingRow): Building {
  return {
    id: row.id,
    name: row.name ?? "",
    buildingNo: row.building_no ?? "",
    roadNo: row.road_no ?? "",
    blockNo: row.block_no ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
  };
}

export function buildingToRow(b: Building): BuildingRow {
  return {
    id: b.id,
    name: b.name ?? "",
    building_no: b.buildingNo ?? "",
    road_no: b.roadNo ?? "",
    block_no: b.blockNo ?? "",
    city: b.city ?? "",
    country: b.country ?? "",
  };
}
