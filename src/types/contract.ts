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
export type ContractTerm = 3 | 6 | 9 | 12;

export interface Contract {
  id: string;
  contractNo: string;
  clientId: string;
  floorKey?: string;
  officeNo?: string;
  clientType: ClientType;
  monthlyRent: number;
  months: number;
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

export type InvoiceStatus = "issued" | "paid";

export interface Invoice {
  id: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string;
  paidByStaffId?: string;
  receiptPath?: string;
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
