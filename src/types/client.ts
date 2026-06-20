export type ClientStatus = "pending" | "sent" | "paid" | "overdue";
export type InvoiceType = "subscription" | "rent";

export interface Client {
  id: string;
  name: string;
  company: string;
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
}

export type ClientInput = Omit<Client, "id" | "createdAt" | "paidAt"> & {
  id?: string;
};
