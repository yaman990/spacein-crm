export type ClientType = "individual" | "commercial";

export type ContractStatus =
  | "reserved" // contract created, first invoice unpaid — office locked
  | "active" // paid + receipt uploaded, running
  | "renewal_await_payment" // term ended, renewed, awaiting receipt/payment
  | "expired" // term ended (terminate) — awaiting staff close
  | "closed"; // finished — office freed

export type EndAction = "auto_renew" | "terminate";
export type DiscountKind = "fixed" | "percent";
export type DiscountScope = "this_period" | "every_period";

/** Contract term in months — presets are offered but any number is valid. */
export type ContractTerm = number;
/** Quick-pick contract terms (months); any custom number is also allowed. */
export const TERM_PRESETS = [3, 6, 12, 24, 36] as const;
/** Payment-cycle options: the client pays every N months, in advance. */
export const PAYMENT_PRESETS = [1, 3, 6, 9, 12] as const;

export interface Contract {
  id: string;
  contractNo: string;
  clientId: string;
  floorKey?: string;
  officeNo?: string;
  clientType: ClientType;
  monthlyRent: number;
  /** Total contract term in months (e.g. 24). */
  months: number;
  /** Payment terms: one invoice every N months, paid in advance. */
  paymentMonths: number;
  renewalMonths: number;
  discountValue: number;
  discountKind: DiscountKind;
  discountScope: DiscountScope;
  startDate: string;
  endDate: string;
  endAction: EndAction;
  status: ContractStatus;
  renewalCount: number;
  createdByStaffId?: string;
  createdAt: string;
}

export type InvoiceStatus = "issued" | "paid" | "partial" | "void";

export interface Invoice {
  id: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  /** How much has been received so far (0 … amount). */
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string;
  paidByStaffId?: string;
  receiptPath?: string;
}

/** One receipt against an invoice — invoices can have several (partial pay). */
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  paidByStaffId?: string;
  receiptPath?: string;
  note?: string;
}

export interface OfficeDetails {
  floorKey: string;
  officeNo: string;
  areaSqm?: number;
  rate3?: number;
  rate6?: number;
  rate9?: number;
  rate12?: number;
  multiTenant: boolean;
  capacity: number;
}

export interface Building {
  id: string;
  name: string;
  buildingNo: string;
  roadNo: string;
  blockNo: string;
  city: string;
  country: string;
}

/** Contract total for a period = monthly × months, minus the discount. */
export function periodAmount(
  monthlyRent: number,
  months: number,
  discountValue: number,
  discountKind: DiscountKind,
): number {
  const base = monthlyRent * months;
  const net =
    discountKind === "percent"
      ? base * (1 - discountValue / 100)
      : base - discountValue;
  return Math.max(0, Math.round(net * 1000) / 1000);
}
