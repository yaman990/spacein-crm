import { crRegistryState } from "@/lib/cr-registry";
import { deriveOccupancy, officeDetailsMap } from "@/lib/office-contracts";
import { resolveOfficeStatus } from "@/lib/office-stats";
import type { Client } from "@/types/client";
import type {
  Contract,
  Invoice,
  OfficeDetails,
  Payment,
} from "@/types/contract";
import type { FloorsMap, OfficeOverrides } from "@/types/office";

export interface ReportColumn {
  key: string;
  label: string;
  numeric?: boolean;
  /** Summed into a totals row (money columns only, not counts/days). */
  total?: boolean;
}
export type ReportRow = Record<string, string | number>;

export interface ReportContext {
  clients: Client[];
  contracts: Contract[];
  invoices: Invoice[];
  payments: Payment[];
  floors: FloorsMap;
  officeOverrides: OfficeOverrides;
  officeDetails: OfficeDetails[];
  from: string; // "" or yyyy-mm-dd
  to: string;
  today: string;
}

export interface ReportDef {
  key: string;
  name: string;
  description: string;
  usesDates: boolean;
  columns: ReportColumn[];
  build(ctx: ReportContext): ReportRow[];
}

const CONTRACT_STATUS: Record<string, string> = {
  reserved: "Reserved",
  active: "Active",
  renewal_await_payment: "Awaiting renewal payment",
  expired: "Expired",
  closed: "Closed",
};

const dateInRange = (d: string, from: string, to: string) =>
  (!from || d >= from) && (!to || d <= to);

function daysBetween(a: string, b: string) {
  const t = (s: string) => new Date(s + "T00:00:00").getTime();
  return Math.round((t(b) - t(a)) / 86400000);
}

function invStatus(inv: Invoice, today: string): string {
  if (inv.status === "void") return "Written off";
  const remaining = Math.max(0, inv.amount - (inv.paidAmount || 0));
  if (remaining <= 0.0005) return "Paid";
  if (inv.periodStart && inv.periodStart < today) return "Overdue";
  if ((inv.paidAmount || 0) > 0) return "Partial";
  return "Unpaid";
}

export const REPORTS: ReportDef[] = [
  {
    key: "clients",
    name: "Clients",
    description: "All clients with CR and contact details",
    usesDates: false,
    columns: [
      { key: "name", label: "Contact" },
      { key: "company", label: "CR / Company" },
      { key: "type", label: "Type" },
      { key: "cr", label: "CR No." },
      { key: "crExpiry", label: "CR Expiry" },
      { key: "crStatus", label: "CR Health" },
      { key: "office", label: "Office" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "rentedBy", label: "Handled By" },
      { key: "joinDate", label: "Join Date" },
    ],
    build: ({ clients }) =>
      clients.map((c) => ({
        name: c.name,
        company: c.company,
        type: c.type ?? "",
        cr: c.rank,
        crExpiry: c.crExpiry ?? "",
        crStatus: crRegistryState(c).label,
        office: c.office,
        phone: c.phone,
        email: c.email,
        rentedBy: c.rentedBy,
        joinDate: c.joinDate,
      })),
  },
  {
    key: "contracts",
    name: "Rent contracts",
    description: "Office lease contracts, filterable by period",
    usesDates: true,
    columns: [
      { key: "contractNo", label: "Contract" },
      { key: "client", label: "Client" },
      { key: "office", label: "Office" },
      { key: "rent", label: "Monthly Rent", numeric: true, total: true },
      { key: "term", label: "Term (mo)", numeric: true },
      { key: "cycle", label: "Pays Every (mo)", numeric: true },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "status", label: "Status" },
    ],
    build: ({ contracts, clients, from, to }) => {
      const byId = new Map(clients.map((c) => [c.id, c]));
      return contracts
        .filter(
          (c) =>
            (!from || (c.endDate || "9999-12-31") >= from) &&
            (!to || (c.startDate || "") <= to),
        )
        .map((c) => {
          const cl = byId.get(c.clientId);
          return {
            contractNo: c.contractNo,
            client: cl?.company || cl?.name || "",
            office: c.officeNo ?? "",
            rent: Number(c.monthlyRent || 0),
            term: c.months,
            cycle: c.paymentMonths || c.months,
            start: c.startDate,
            end: c.endDate,
            status: CONTRACT_STATUS[c.status] ?? c.status,
          };
        });
    },
  },
  {
    key: "invoices",
    name: "Invoices",
    description: "All invoices; filter by period or search a client / office",
    usesDates: true,
    columns: [
      { key: "client", label: "Client" },
      { key: "office", label: "Office" },
      { key: "contractNo", label: "Contract" },
      { key: "periodStart", label: "Period Start" },
      { key: "periodEnd", label: "Period End" },
      { key: "amount", label: "Amount", numeric: true, total: true },
      { key: "paid", label: "Paid", numeric: true, total: true },
      { key: "remaining", label: "Remaining", numeric: true, total: true },
      { key: "status", label: "Status" },
    ],
    build: ({ invoices, contracts, clients, from, to, today }) => {
      const cById = new Map(contracts.map((c) => [c.id, c]));
      const clById = new Map(clients.map((c) => [c.id, c]));
      return invoices
        .filter((i) => dateInRange(i.periodStart, from, to))
        .map((i) => {
          const c = cById.get(i.contractId);
          const cl = c ? clById.get(c.clientId) : undefined;
          const paid = i.paidAmount || 0;
          const remaining =
            i.status === "void" ? 0 : Math.max(0, i.amount - paid);
          return {
            client: cl?.company || cl?.name || "",
            office: c?.officeNo ?? "",
            contractNo: c?.contractNo ?? "",
            periodStart: i.periodStart,
            periodEnd: i.periodEnd,
            amount: Number(i.amount || 0),
            paid: Number(paid),
            remaining: Number(remaining),
            status: invStatus(i, today),
          };
        });
    },
  },
  {
    key: "overdue",
    name: "Overdue invoices",
    description: "Unpaid invoices past due — any contract, including closed",
    usesDates: false,
    columns: [
      { key: "client", label: "Client" },
      { key: "office", label: "Office" },
      { key: "contractNo", label: "Contract" },
      { key: "due", label: "Due (period start)" },
      { key: "amount", label: "Amount", numeric: true, total: true },
      { key: "remaining", label: "Remaining", numeric: true, total: true },
      { key: "daysOverdue", label: "Days Overdue", numeric: true },
    ],
    build: ({ invoices, contracts, clients, today }) => {
      const cById = new Map(contracts.map((c) => [c.id, c]));
      const clById = new Map(clients.map((c) => [c.id, c]));
      return invoices
        .filter((i) => {
          if (i.status === "void") return false;
          const remaining = Math.max(0, i.amount - (i.paidAmount || 0));
          return remaining > 0.0005 && !!i.periodStart && i.periodStart < today;
        })
        .map((i) => {
          const c = cById.get(i.contractId);
          const cl = c ? clById.get(c.clientId) : undefined;
          const remaining = Math.max(0, i.amount - (i.paidAmount || 0));
          return {
            client: cl?.company || cl?.name || "",
            office: c?.officeNo ?? "",
            contractNo: c?.contractNo ?? "",
            due: i.periodStart,
            amount: Number(i.amount || 0),
            remaining: Number(remaining),
            daysOverdue: daysBetween(i.periodStart, today),
          };
        })
        .sort((a, b) => Number(b.daysOverdue) - Number(a.daysOverdue));
    },
  },
  {
    key: "payments",
    name: "Payments received",
    description: "Receipts recorded, filterable by period",
    usesDates: true,
    columns: [
      { key: "date", label: "Date" },
      { key: "client", label: "Client" },
      { key: "office", label: "Office" },
      { key: "contractNo", label: "Contract" },
      { key: "amount", label: "Amount", numeric: true, total: true },
    ],
    build: ({ payments, invoices, contracts, clients, from, to }) => {
      const iById = new Map(invoices.map((i) => [i.id, i]));
      const cById = new Map(contracts.map((c) => [c.id, c]));
      const clById = new Map(clients.map((c) => [c.id, c]));
      return payments
        .map((p) => ({ p, date: (p.paidAt || "").slice(0, 10) }))
        .filter(({ date }) => dateInRange(date, from, to))
        .map(({ p, date }) => {
          const inv = iById.get(p.invoiceId);
          const c = inv ? cById.get(inv.contractId) : undefined;
          const cl = c ? clById.get(c.clientId) : undefined;
          return {
            date,
            client: cl?.company || cl?.name || "",
            office: c?.officeNo ?? "",
            contractNo: c?.contractNo ?? "",
            amount: Number(p.amount || 0),
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
    },
  },
  {
    key: "cr-expiry",
    name: "CR expiry",
    description: "Commercial-registration expiry & status per commercial client",
    usesDates: false,
    columns: [
      { key: "client", label: "Client" },
      { key: "cr", label: "CR No." },
      { key: "crExpiry", label: "CR Expiry" },
      { key: "crStatus", label: "Registry Status" },
      { key: "health", label: "Health" },
    ],
    build: ({ clients }) =>
      clients
        .filter((c) => c.type !== "individual")
        .map((c) => ({
          client: c.company || c.name,
          cr: c.rank,
          crExpiry: c.crExpiry ?? "",
          crStatus: c.crStatus ?? "",
          health: crRegistryState(c).label,
        })),
  },
  {
    key: "occupancy",
    name: "Office occupancy",
    description: "Current status and occupant of every office",
    usesDates: false,
    columns: [
      { key: "floor", label: "Floor" },
      { key: "office", label: "Office" },
      { key: "status", label: "Status" },
      { key: "occupant", label: "Occupant" },
      { key: "rent", label: "Monthly Rent", numeric: true, total: true },
    ],
    build: ({ floors, officeOverrides, contracts, officeDetails, clients }) => {
      const details = officeDetailsMap(officeDetails);
      const clById = new Map(clients.map((c) => [c.id, c]));
      const rows: ReportRow[] = [];
      Object.entries(floors).forEach(([fk, floor]) =>
        floor.sections.forEach((sec) =>
          sec.offices.forEach((o) => {
            if (!o.no || o.no === "—") return;
            const legacy = resolveOfficeStatus(fk, o.no, o.st, officeOverrides);
            const occ = deriveOccupancy(fk, o.no, contracts, details, legacy, o.co);
            const contract = occ.contracts[0];
            const occupant = contract
              ? clById.get(contract.clientId)?.company ||
                clById.get(contract.clientId)?.name ||
                ""
              : occ.legacyOccupant || "";
            rows.push({
              floor: floor.label,
              office: o.no,
              status: occ.status,
              occupant,
              rent: occ.contracts.reduce(
                (s, c) => s + Number(c.monthlyRent || 0),
                0,
              ),
            });
          }),
        ),
      );
      return rows;
    },
  },
];

export function getReport(key: string): ReportDef {
  return REPORTS.find((r) => r.key === key) ?? REPORTS[0];
}

/**
 * A totals row summing every column marked `total`. Returns null when the
 * report has no money columns. The first non-total column is labelled "TOTAL".
 */
export function reportTotals(
  columns: ReportColumn[],
  rows: ReportRow[],
): ReportRow | null {
  if (!columns.some((c) => c.total)) return null;
  const out: ReportRow = {};
  let labelled = false;
  for (const c of columns) {
    if (c.total) {
      const sum = rows.reduce(
        (s, r) => s + (typeof r[c.key] === "number" ? (r[c.key] as number) : 0),
        0,
      );
      out[c.key] = Math.round(sum * 1000) / 1000;
    } else if (!labelled) {
      out[c.key] = "TOTAL";
      labelled = true;
    } else {
      out[c.key] = "";
    }
  }
  return out;
}
