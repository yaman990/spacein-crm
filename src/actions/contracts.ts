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
  rowToInvoice,
} from "@/lib/supabase/mappers";
import { sendEmailViaResend } from "@/lib/email/resend";
import {
  categorizeContracts,
  daysUntil,
  monthsBetween,
  nextCycle,
} from "@/lib/contract-checks";
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
      // rent is paid in advance: the invoice is due when its cycle starts
      due_date: input.periodStart,
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
  /** Total contract term in months (e.g. 24). */
  months: number;
  /** Payment terms: one invoice every N months, paid in advance. */
  paymentMonths?: number;
  renewalMonths?: number;
  discountValue?: number;
  discountKind?: DiscountKind;
  discountScope?: DiscountScope;
  startDate: string;
  endAction?: EndAction;
}

/**
 * Creates a contract (status "reserved" — office locked until paid) and
 * issues the FIRST payment-cycle invoice only (e.g. a 24-month contract paid
 * every 3 months starts with one 3-month invoice, due at the cycle start).
 * Later cycles are issued by the "Run renewals & reminders" check ~30 days
 * before each cycle begins.
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
  const paymentMonths = Math.max(
    1,
    Math.min(input.paymentMonths || input.months, input.months),
  );
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
    paymentMonths,
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

  // first payment cycle (clamped to the term end); discount always applies
  // to the first cycle regardless of scope
  let firstEnd = addMonths(startDate, paymentMonths);
  if (firstEnd > endDate) firstEnd = endDate;
  const firstMonths = Math.max(1, monthsBetween(startDate, firstEnd));
  const invoice: Invoice = {
    id: uid(),
    contractId: contract.id,
    periodStart: startDate,
    periodEnd: firstEnd,
    amount: periodAmount(
      input.monthlyRent,
      firstMonths,
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
    months: firstMonths,
    periodStart: startDate,
    periodEnd: firstEnd,
    amount: invoice.amount,
  });

  return contract;
}

export interface UpdateContractInput {
  contractId: string;
  clientId?: string;
  floorKey?: string;
  officeNo?: string;
  clientType?: ClientType;
  monthlyRent?: number;
  /** Total contract term in months. */
  months?: number;
  /** Payment terms: one invoice every N months. */
  paymentMonths?: number;
  startDate?: string;
  discountValue?: number;
  discountKind?: DiscountKind;
  discountScope?: DiscountScope;
  endAction?: EndAction;
  renewalMonths?: number;
}

/**
 * Corrects a contract (staff who created it, or an admin).
 *
 * - Renewal settings (end action, renewal period) are editable anytime.
 * - While NOTHING is paid yet: everything can be corrected (client, office,
 *   rent, term, payment terms, start date, discount) and the open first-cycle
 *   invoice is regenerated.
 * - Once some cycle is PAID: rent / discount / payment terms can still change
 *   (they regenerate the current OPEN cycle invoice and apply to future
 *   cycles), but client / office / start date / term cannot — paid history is
 *   never rewritten; for those cases close the contract and recreate it.
 */
export async function updateContractAction(
  input: UpdateContractInput,
): Promise<void> {
  const session = await requireSession();
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", input.contractId)
    .single();
  if (error || !row) throw new Error("Contract not found");

  const isAdmin = session.user.role === "admin";
  const isCreator = row.created_by_staff_id === session.user.id;
  if (!isAdmin && !isCreator) {
    throw new Error(
      "Only the staff who created this contract, or an admin, can edit it",
    );
  }
  if (row.status === "closed") throw new Error("This contract is closed");

  const { data: contractInvoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("contract_id", input.contractId)
    .order("period_end", { ascending: false });
  const openInvoice = (contractInvoices ?? []).find(
    (i) => i.status === "issued",
  );
  const hasPaid = (contractInvoices ?? []).some((i) => i.status === "paid");

  const identityKeys = ["clientId", "officeNo", "startDate", "months"] as const;
  const wantsIdentityEdit = identityKeys.some((k) => input[k] !== undefined);
  const cycleKeys = [
    "monthlyRent",
    "paymentMonths",
    "discountValue",
    "discountKind",
    "discountScope",
    "clientType",
  ] as const;
  const wantsCycleEdit = cycleKeys.some((k) => input[k] !== undefined);

  if (wantsIdentityEdit && hasPaid) {
    throw new Error(
      "This contract already has paid periods — client, office, start date and term can't be changed. Close it and create a corrected contract instead.",
    );
  }
  if ((wantsIdentityEdit || wantsCycleEdit) && !openInvoice) {
    throw new Error(
      "All invoices are paid — only the renewal settings can be changed until the next cycle is issued.",
    );
  }

  const changes: string[] = [];
  const patch: Record<string, unknown> = {};

  if (input.endAction && input.endAction !== row.end_action) {
    patch.end_action = input.endAction;
    changes.push(`end action → ${input.endAction}`);
  }
  if (
    input.renewalMonths !== undefined &&
    input.renewalMonths !== Number(row.renewal_months)
  ) {
    patch.renewal_months = input.renewalMonths;
    changes.push(`renewal period → ${input.renewalMonths} mo`);
  }

  if (openInvoice && (wantsIdentityEdit || wantsCycleEdit)) {
    const monthlyRent = input.monthlyRent ?? Number(row.monthly_rent);
    const termMonths = input.months ?? (Number(row.months) || 12);
    const paymentMonths = Math.max(
      1,
      Math.min(
        input.paymentMonths ??
          (Number(row.payment_months) || Number(row.months) || 12),
        termMonths,
      ),
    );
    const discountValue = input.discountValue ?? Number(row.discount_value);
    const discountKind =
      input.discountKind ?? (row.discount_kind as DiscountKind);
    const discountScope =
      input.discountScope ?? (row.discount_scope as DiscountScope);

    // contract-level fields
    if (input.clientId && input.clientId !== row.client_id) {
      patch.client_id = input.clientId;
      changes.push("client changed");
    }
    if (input.officeNo && input.officeNo !== row.office_no) {
      patch.floor_key = input.floorKey ?? row.floor_key;
      patch.office_no = input.officeNo;
      changes.push(`office → ${input.officeNo}`);
    }
    if (input.clientType) patch.client_type = input.clientType;
    if (monthlyRent !== Number(row.monthly_rent)) {
      patch.monthly_rent = monthlyRent;
      changes.push(`rent → ${monthlyRent}/mo`);
    }
    if (paymentMonths !== (Number(row.payment_months) || Number(row.months))) {
      patch.payment_months = paymentMonths;
      changes.push(`payment terms → every ${paymentMonths} mo`);
    }
    patch.discount_value = discountValue;
    patch.discount_kind = discountKind;
    patch.discount_scope = discountScope;

    // period geometry of the OPEN cycle being regenerated
    const isFreshContract = !hasPaid && Number(row.renewal_count) === 0;
    let contractStart = row.start_date as string;
    let contractEnd = row.end_date as string;
    let cycleStart = openInvoice.period_start as string;
    if (isFreshContract) {
      contractStart = input.startDate ?? contractStart;
      contractEnd = addMonths(contractStart, termMonths);
      cycleStart = contractStart;
      patch.months = termMonths;
      patch.start_date = contractStart;
      patch.end_date = contractEnd;
      if (termMonths !== Number(row.months))
        changes.push(`term → ${termMonths} mo`);
      if (contractStart !== row.start_date)
        changes.push(`start → ${contractStart}`);
    }
    let cycleEnd = addMonths(cycleStart, paymentMonths);
    if (cycleEnd > contractEnd) cycleEnd = contractEnd;
    const cycleMonths = Math.max(1, monthsBetween(cycleStart, cycleEnd));
    const discountApplies =
      isFreshContract || discountScope === "every_period" ? discountValue : 0;
    const amount = periodAmount(
      monthlyRent,
      cycleMonths,
      discountApplies,
      discountKind,
    );

    const { error: iErr } = await supabase
      .from("invoices")
      .update({
        period_start: cycleStart,
        period_end: cycleEnd,
        amount,
      })
      .eq("id", openInvoice.id);
    if (iErr) throw new Error(iErr.message);

    const targetClient = (patch.client_id as string) ?? row.client_id;
    await syncClientBilling(supabase, {
      clientId: targetClient,
      monthlyRent,
      months: cycleMonths,
      periodStart: cycleStart,
      periodEnd: cycleEnd,
      amount,
    });
    if (patch.office_no || patch.client_type) {
      await supabase
        .from("clients")
        .update({
          office: (patch.office_no as string) ?? row.office_no,
          type: (patch.client_type as string) ?? row.client_type,
        })
        .eq("id", targetClient);
    }
  }

  if (Object.keys(patch).length === 0) return;

  const { error: cErr } = await supabase
    .from("contracts")
    .update(patch)
    .eq("id", input.contractId);
  if (cErr) throw new Error(cErr.message);

  if (changes.length > 0) {
    await supabase.from("activity_log").insert({
      id: uid(),
      type: "created",
      cid: (patch.client_id as string) ?? row.client_id,
      cname: session.user.name ?? "",
      description: `Contract ${row.contract_no} corrected: ${changes.join(", ")}`,
      amt: null,
      ts: new Date().toISOString(),
    });
  }
}

/**
 * Renew a contract: extend the TERM by the renewal period and issue the first
 * payment-cycle invoice of the renewal (later cycles come via Run checks).
 */
export async function renewContractAction(contractId: string): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (error || !row) throw new Error("Contract not found");

  const renewalMonths =
    Number(row.renewal_months) || Number(row.months) || 12;
  const oldEnd = row.end_date as string;
  const newEnd = addMonths(oldEnd, renewalMonths);

  const cycle = nextCycle(
    {
      endDate: newEnd,
      paymentMonths: Number(row.payment_months) || renewalMonths,
      months: renewalMonths,
      monthlyRent: Number(row.monthly_rent) || 0,
      discountValue: Number(row.discount_value) || 0,
      discountKind: (row.discount_kind as "fixed" | "percent") ?? "fixed",
      discountScope:
        (row.discount_scope as "this_period" | "every_period") ??
        "this_period",
    },
    oldEnd,
  );
  if (!cycle) throw new Error("Nothing to renew");

  const invoice: Invoice = {
    id: uid(),
    contractId,
    periodStart: cycle.periodStart,
    periodEnd: cycle.periodEnd,
    amount: cycle.amount,
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
      end_date: newEnd,
      status: "renewal_await_payment",
      renewal_count: (Number(row.renewal_count) || 0) + 1,
    })
    .eq("id", contractId);
  if (cErr) throw new Error(cErr.message);

  await syncClientBilling(supabase, {
    clientId: row.client_id as string,
    monthlyRent: Number(row.monthly_rent) || 0,
    months: cycle.months,
    periodStart: cycle.periodStart,
    periodEnd: cycle.periodEnd,
    amount: cycle.amount,
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
  cyclesInvoiced: number;
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

  const [cRes, iRes, clRes, stRes, setRes] = await Promise.all([
    supabase.from("contracts").select("*"),
    supabase.from("invoices").select("*"),
    supabase.from("clients").select("id, name, company, email"),
    supabase.from("crm_users").select("id, name, email"),
    supabase
      .from("crm_settings")
      .select("key, value")
      .eq("key", "contract_reminders"),
  ]);

  const contracts = (cRes.data ?? []).map(rowToContract);
  const allInvoices = (iRes.data ?? []).map(rowToInvoice);
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
    cyclesInvoiced: 0,
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
    const renewalMonths = c.renewalMonths || c.months || 12;
    const newEnd = addMonths(c.endDate, renewalMonths);
    // issue only the FIRST payment cycle of the renewal
    const cycle = nextCycle({ ...c, endDate: newEnd }, c.endDate);
    if (!cycle) continue;
    await supabase.from("invoices").insert(
      invoiceToRow({
        id: uid(),
        contractId: c.id,
        periodStart: cycle.periodStart,
        periodEnd: cycle.periodEnd,
        amount: cycle.amount,
        status: "issued",
        issuedAt: now,
      }),
    );
    await supabase
      .from("contracts")
      .update({
        end_date: newEnd,
        status: "renewal_await_payment",
        renewal_count: c.renewalCount + 1,
      })
      .eq("id", c.id);
    await syncClientBilling(supabase, {
      clientId: c.clientId,
      monthlyRent: c.monthlyRent,
      months: cycle.months,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      amount: cycle.amount,
    });
    delete reminders[c.id];
    summary.renewed++;
    const cl = clientById.get(c.clientId);
    const st = c.createdByStaffId ? staffById.get(c.createdByStaffId) : undefined;
    await send(
      cl?.email,
      `Contract ${c.contractNo} renewed — payment required`,
      `Dear ${nameOf(c.clientId)},\n\nYour office contract ${c.contractNo} (Office ${c.officeNo}) has been renewed for ${renewalMonths} month(s), until ${newEnd}.\n\nThe first payment cycle (${cycle.periodStart} to ${cycle.periodEnd}) is ${cycle.amount.toFixed(3)} BHD, due in advance on ${cycle.periodStart}. Please complete payment and send the transfer receipt so we can activate the renewal.\n\nSpace IN Business Center`,
    );
    await send(
      st?.email,
      `Contract ${c.contractNo} auto-renewed (awaiting payment)`,
      `Contract ${c.contractNo} for ${nameOf(c.clientId)} (Office ${c.officeNo}) auto-renewed until ${newEnd}. First cycle ${cycle.periodStart} → ${cycle.periodEnd}, ${cycle.amount.toFixed(3)} BHD. Awaiting receipt/payment.`,
    );
    summary.details.push(`Renewed ${c.contractNo} (Office ${c.officeNo})`);
  }

  // Payment cycles: issue the next cycle invoice ~30 days before it starts,
  // for active contracts whose term still has uninvoiced cycles.
  const latestEndByContract = new Map<string, string>();
  for (const inv of allInvoices) {
    const prev = latestEndByContract.get(inv.contractId);
    if (!prev || inv.periodEnd > prev)
      latestEndByContract.set(inv.contractId, inv.periodEnd);
  }
  for (const c of contracts) {
    if (c.status !== "active") continue;
    const lastEnd = latestEndByContract.get(c.id) ?? c.startDate;
    const cycle = nextCycle(c, lastEnd);
    if (!cycle) continue; // term fully invoiced
    if (daysUntil(cycle.periodStart, today) > 30) continue; // not due yet
    await supabase.from("invoices").insert(
      invoiceToRow({
        id: uid(),
        contractId: c.id,
        periodStart: cycle.periodStart,
        periodEnd: cycle.periodEnd,
        amount: cycle.amount,
        status: "issued",
        issuedAt: now,
      }),
    );
    await syncClientBilling(supabase, {
      clientId: c.clientId,
      monthlyRent: c.monthlyRent,
      months: cycle.months,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      amount: cycle.amount,
    });
    summary.cyclesInvoiced++;
    const cl = clientById.get(c.clientId);
    const st = c.createdByStaffId ? staffById.get(c.createdByStaffId) : undefined;
    await send(
      cl?.email,
      `Invoice for Office ${c.officeNo} — next rent period`,
      `Dear ${nameOf(c.clientId)},\n\nYour next rent period for Office ${c.officeNo} (contract ${c.contractNo}) runs ${cycle.periodStart} to ${cycle.periodEnd}.\n\nAmount: ${cycle.amount.toFixed(3)} BHD, payable in advance by ${cycle.periodStart}. Kindly arrange the transfer and send us the receipt.\n\nSpace IN Business Center`,
    );
    await send(
      st?.email,
      `Cycle invoice issued — ${c.contractNo} (Office ${c.officeNo})`,
      `Next payment cycle invoiced for ${nameOf(c.clientId)}: ${cycle.periodStart} → ${cycle.periodEnd}, ${cycle.amount.toFixed(3)} BHD, due ${cycle.periodStart}.`,
    );
    summary.details.push(
      `Cycle invoiced ${c.contractNo} (${cycle.periodStart} → ${cycle.periodEnd})`,
    );
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
