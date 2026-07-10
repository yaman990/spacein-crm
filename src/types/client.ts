export type ClientStatus = "pending" | "sent" | "paid" | "overdue";
export type InvoiceType = "subscription" | "rent";
export type ClientType = "individual" | "commercial";

export interface Client {
  id: string;
  name: string;
  /** For commercial clients this is the registered CR name. */
  company: string;
  type?: ClientType;
  /** Authorized signatory — signs contracts on behalf of the CR. */
  authorizedName?: string;
  authorizedCpr?: string;
  authorizedNationality?: string;
  rank: string;
  office: string;
  phone: string;
  email: string;
  rentedBy: string;
  notes: string;
  joinDate: string;
  dueDate: string;
  amount: number;
  invoiceType: InvoiceType;
  rentMonths?: number;
  monthlyRent?: number;
  rentStart?: string;
  rentEnd?: string;
  status: ClientStatus;
  createdAt: string;
  paidAt?: string;
  crExpiry?: string;
  /** Registry status from Sijilat (Active / Suspended / Cancelled …). */
  crStatus?: string;
}

export type ClientInput = Omit<Client, "id" | "createdAt" | "paidAt"> & {
  id?: string;
};
