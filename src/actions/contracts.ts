"use server";

import { auth } from "@/lib/auth";
import { uid, addMonths } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildingToRow,
  contractToRow,
  invoiceToRow,
  officeDetailsToRow,
  rowToContract,
} from "@/lib/supabase/mappers";
import { sendEmailViaResend } from "@/lib/email/resend";
import { categorizeContracts, daysUntil } from "@/lib/contract-checks";
import type {
  Building,
  Contract,
  DiscountKind,
  DiscountScope,
  EndAction,
  Invoice,
  OfficeDetails,
} from "@/types/contract";
import { periodAmount } from "@/types/contract";
import type { ClientType } from "@/types/client";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

/**
 * Bridge: keep the client's legacy billing fields (amount / due date / rent
 * period / status) in sync with the client's current contract period, so the
 * Dashboard, Clients table, Alerts, comms templates and A4 invoice printing
 * all reflect the contract without their own logic changing.
 */
async function syncClientBilling(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    clientId: string;
    monthlyRent: number;
    months: number;
    periodStart: string;
    periodEnd: string;
    amount: number;
  },
): Promise<void> {
  await supabase
    .from("clients")
    .update({
      invoice_type: "rent",
      monthly_rent: input.monthlyRent,
      rent_months: input.months,
      rent_start: input.periodStart,
      rent_end: input.periodEnd,
      amount: input.amount,
      due_date: input.periodEnd,
      status: "pending",
      paid_at: null,
    })
    .eq("id", input.clientId);
}

async function nextContractNo(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const { data } = await supabase.from("contracts").select("contract_no");
  const max = (data ?? []).reduce((m, r) => {
    const n = parseInt(String(r.contract_no).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `C-${String(max + 1).padStart(4, "0")}`;
}

export interface CreateContractInput {
  clientId: string;
  floorKey?: string;
  officeNo?: string;
  clientType: ClientType;
  monthlyRent: number;
  months: number;
  renewalMonths?: number;
  discountValue?: number;
  discountKind?: DiscountKind;
  discountScope?: DiscountScope;
  startDate: string;
  endAction?: EndAction;
}

/**
 * Creates a contract (status "reserved" — office locked, first invoice unpaid)
 * plus its first period invoice.
 */
export async function createContractAction(
  input: CreateContractInput,
): Promise<Contract> {
  const session = await requireSession();
  const supabase = createAdminClient();

  const discountValue = input.discountValue ?? 0;
  const discountKind = input.discountKind ?? "fixed";
  const startDate = input.startDate;
  const endDate = addMonths(startDate, input.months);
  const now = new Date().toISOString();

  const contract: Contract = {
    id: uid(),
    contractNo: await nextContractNo(supabase),
    clientId: input.clientId,
    floorKey: input.floorKey,
    officeNo: input.officeNo,
    clientType: input.clientType,
    monthlyRent: input.monthlyRent,
    months: input.months,
    renewalMonths: input.renewalMonths || input.months,
    discountValue,
    discountKind,
    discountScope: input.discountScope ?? "this_period",
    startDate,
    endDate,
    endAction: input.endAction ?? "auto_renew",
    status: "reserved",
    renewalCount: 0,
    createdByStaffId: session.user.id,
    createdAt: now,
  };

  const { error } = await supabase
    .from("contracts")
    .insert(contractToRow(contract));
  if (error) throw new Error(error.message);

  const invoice: Invoice = {
    id: uid(),
    contractId: contract.id,
    periodStart: startDate,
    periodEnd: endDate,
    amount: periodAmount(
      input.monthlyRent,
      input.months,
      discountValue,
      discountKind,
    ),
    status: "issued",
    issuedAt: now,
  };
  const { error: iErr } = await supabase
    .from("invoices")
    .insert(invoiceToRow(invoice));
  if (iErr) throw new Error(iErr.message);

  // keep the legacy client record in sync (office link + billing fields)
  if (input.officeNo) {
    await supabase
      .from("clients")
      .update({ office: input.officeNo, type: input.clientType })
      .eq("id", input.clientId);
  }
  await syncClientBilling(supabase, {
    clientId: input.clientId,
    monthlyRent: input.monthlyRent,
    months: input.months,
    periodStart: startDate,
    periodEnd: endDate,
    amount: invoice.amount,
  });

  return contract;
}

/** Renew a contract: extend to the next period + issue its (unpaid) invoice. */
export async function renewContractAction(contractId: string): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (error || !row) throw new Error("Contract not found");

  const months = Number(row.renewal_months) || Number(row.months) || 12;
  const periodStart = row.end_date as string;
  const periodEnd = addMonths(periodStart, months);
  const discount =
    row.discount_scope === "every_period" ? Number(row.discount_value) || 0 : 0;
  const amount = periodAmount(
    Number(row.monthly_rent) || 0,
    months,
    discount,
    (row.discount_kind as "fixed" | "percent") ?? "fixed",
  );

  const invoice: Invoice = {
    id: uid(),
    contractId,
    periodStart,
    periodEnd,
    amount,
    status: "issued",
    issuedAt: new Date().toISOString(),
  };
  const { error: iErr } = await supabase
    .from("invoices")
    .insert(invoiceToRow(invoice));
  if (iErr) throw new Error(iErr.message);

  const { error: cErr } = await supabase
    .from("contracts")
    .update({
      end_date: periodEnd,
      status: "renewal_await_payment",
      renewal_count: (Number(row.renewal_count) || 0) + 1,
    })
    .eq("id", contractId);
  if (cErr) throw new Error(cErr.message);

  await syncClientBilling(supabase, {
    clientId: row.client_id as string,
    monthlyRent: Number(row.monthly_rent) || 0,
    months,
    periodStart,
    periodEnd,
    amount,
  });
}

/** Close a contract → frees the office. Creator staff or an admin only. */
export async function closeContractAction(contractId: string): Promise<void> {
  const session = await requireSession();
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("contracts")
    .select("created_by_staff_id")
    .eq("id", contractId)
    .single();
  if (error || !row) throw new Error("Contract not found");

  const isAdmin = session.user.role === "admin";
  const isCreator = row.created_by_staff_id === session.user.id;
  if (!isAdmin && !isCreator) {
    throw new Error("Only the staff who created this contract, or an admin, can close it");
  }

  const { error: cErr } = await supabase
    .from("contracts")
    .update({ status: "closed" })
    .eq("id", contractId);
  if (cErr) throw new Error(cErr.message);
}

/**
 * Marks an invoice paid — REQUIRES a receipt PDF (<=1MB). Uploads the receipt
 * to the private `receipts` bucket, records it, and activates the contract if
 * it was awaiting payment (reserved / renewal).
 */
export async function markInvoicePaidAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = createAdminClient();

  const invoiceId = String(formData.get("invoiceId") || "");
  const file = formData.get("receipt");
  if (!invoiceId) throw new Error("Missing invoice");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("A receipt PDF is required to mark this paid");
  if (file.type !== "application/pdf")
    throw new Error("The receipt must be a PDF file");
  if (file.size > 1024 * 1024)
    throw new Error("The receipt must be 1 MB or less");

  const path = `${invoiceId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (upErr) throw new Error(upErr.message);

  const { data: inv, error: iErr } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by_staff_id: session.user.id,
      receipt_path: path,
    })
    .eq("id", invoiceId)
    .select("contract_id")
    .single();
  if (iErr) throw new Error(iErr.message);

  if (inv?.contract_id) {
    await supabase
      .from("contracts")
      .update({ status: "active" })
      .eq("id", inv.contract_id)
      .in("status", ["reserved", "renewal_await_payment"]);

    // bridge: reflect the payment on the client record too
    const { data: contract } = await supabase
      .from("contracts")
      .select("client_id")
      .eq("id", inv.contract_id)
      .single();
    if (contract?.client_id) {
      await supabase
        .from("clients")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", contract.client_id);
    }
  }
}

/** Short-lived signed URL to view/download a receipt. */
export async function getReceiptUrlAction(
  invoiceId: string,
): Promise<string | null> {
  await requireSession();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(`${invoiceId}.pdf`, 120);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export interface ChecksSummary {
  renewed: number;
  expired: number;
  reminded: number;
  emailsSent: number;
  emailErrors: number;
  details: string[];
}

/**
 * Admin action: process contracts whose term has ended (auto-renew or mark
 * expired) and email 30-day expiry reminders to clients + the owning staff.
 * "Already reminded" is tracked in crm_settings keyed by contract+end date, so
 * renewals (new end date) naturally re-trigger. No cron required — run on demand.
 */
export async function runContractChecksAction(): Promise<ChecksSummary> {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Admin only");
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const [cRes, clRes, stRes, setRes] = await Promise.all([
    supabase.from("contracts").select("*"),
    supabase.from("clients").select("id, name, company, email"),
    supabase.from("crm_users").select("id, name, email"),
    supabase
      .from("crm_settings")
      .select("key, value")
      .eq("key", "contract_reminders"),
  ]);

  const contracts = (cRes.data ?? []).map(rowToContract);
  const clientById = new Map(
    (clRes.data ?? []).map((c) => [c.id as string, c]),
  );
  const staffById = new Map((stRes.data ?? []).map((s) => [s.id as string, s]));
  const reminders = (setRes.data?.[0]?.value ?? {}) as Record<string, string>;

  const { expiringSoon, dueRenewal, dueExpiry } = categorizeContracts(
    contracts,
    today,
  );
  const summary: ChecksSummary = {
    renewed: 0,
    expired: 0,
    reminded: 0,
    emailsSent: 0,
    emailErrors: 0,
    details: [],
  };

  const send = async (to: string | undefined, subject: string, body: string) => {
    if (!to || !to.trim()) return;
    try {
      await sendEmailViaResend({ to, subject, body });
      summary.emailsSent++;
    } catch {
      summary.emailErrors++;
    }
  };
  const nameOf = (id: string) => {
    const c = clientById.get(id);
    return c?.company || c?.name || "client";
  };

  for (const c of dueRenewal) {
    const months = c.renewalMonths || c.months || 12;
    const periodStart = c.endDate;
    const periodEnd = addMonths(periodStart, months);
    const discount = c.discountScope === "every_period" ? c.discountValue : 0;
    const amount = periodAmount(c.monthlyRent, months, discount, c.discountKind);
    await supabase.from("invoices").insert(
      invoiceToRow({
        id: uid(),
        contractId: c.id,
        periodStart,
        periodEnd,
        amount,
        status: "issued",
        issuedAt: now,
      }),
    );
    await supabase
      .from("contracts")
      .update({
        end_date: periodEnd,
        status: "renewal_await_payment",
        renewal_count: c.renewalCount + 1,
      })
      .eq("id", c.id);
    await syncClientBilling(supabase, {
      clientId: c.clientId,
      monthlyRent: c.monthlyRent,
      months,
      periodStart,
      periodEnd,
      amount,
    });
    delete reminders[c.id];
    summary.renewed++;
    const cl = clientById.get(c.clientId);
    const st = c.createdByStaffId ? staffById.get(c.createdByStaffId) : undefined;
    await send(
      cl?.email,
      `Contract ${c.contractNo} renewed — payment required`,
      `Dear ${nameOf(c.clientId)},\n\nYour office contract ${c.contractNo} (Office ${c.officeNo}) has been renewed for ${months} month(s): ${periodStart} to ${periodEnd}.\n\nInvoice amount: ${amount.toFixed(3)} BHD. Please complete payment and send the transfer receipt so we can activate the renewal.\n\nSpace IN Business Center`,
    );
    await send(
      st?.email,
      `Contract ${c.contractNo} auto-renewed (awaiting payment)`,
      `Contract ${c.contractNo} for ${nameOf(c.clientId)} (Office ${c.officeNo}) auto-renewed: ${periodStart} to ${periodEnd}, ${amount.toFixed(3)} BHD. Awaiting receipt/payment.`,
    );
    summary.details.push(`Renewed ${c.contractNo} (Office ${c.officeNo})`);
  }

  for (const c of dueExpiry) {
    await supabase.from("contracts").update({ status: "expired" }).eq("id", c.id);
    summary.expired++;
    const st = c.createdByStaffId ? staffById.get(c.createdByStaffId) : undefined;
    await send(
      st?.email,
      `Contract ${c.contractNo} expired — action needed`,
      `Contract ${c.contractNo} for ${nameOf(c.clientId)} (Office ${c.officeNo}) expired on ${c.endDate}. Please close it to free the office if it will not be renewed.`,
    );
    summary.details.push(`Expired ${c.contractNo} (Office ${c.officeNo})`);
  }

  for (const c of expiringSoon) {
    if (reminders[c.id] === c.endDate) continue;
    const days = daysUntil(c.endDate, today);
    const cl = clientById.get(c.clientId);
    const st = c.createdByStaffId ? staffById.get(c.createdByStaffId) : undefined;
    await send(
      cl?.email,
      `Your contract ${c.contractNo} expires in ${days} day(s)`,
      `Dear ${nameOf(c.clientId)},\n\nYour office contract ${c.contractNo} (Office ${c.officeNo}) expires on ${c.endDate} — in ${days} day(s). Please contact us to arrange the renewal.\n\nSpace IN Business Center`,
    );
    await send(
      st?.email,
      `Contract ${c.contractNo} expiring in ${days} day(s)`,
      `Reminder: contract ${c.contractNo} for ${nameOf(c.clientId)} (Office ${c.officeNo}) expires on ${c.endDate} (${days} days).`,
    );
    reminders[c.id] = c.endDate;
    summary.reminded++;
    summary.details.push(
      `Reminded ${c.contractNo} (${days}d, Office ${c.officeNo})`,
    );
  }

  await supabase
    .from("crm_settings")
    .upsert({ key: "contract_reminders", value: reminders }, { onConflict: "key" });

  return summary;
}

export async function saveOfficeDetailsAction(
  details: OfficeDetails,
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("office_details")
    .upsert(officeDetailsToRow(details), { onConflict: "floor_key,office_no" });
  if (error) throw new Error(error.message);
}

export async function saveBuildingAction(
  building: Omit<Building, "id"> & { id?: string },
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const row = buildingToRow({ ...building, id: building.id || "main-building" });
  const { error } = await supabase
    .from("buildings")
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
