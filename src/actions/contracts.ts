"use server";

import { auth } from "@/lib/auth";
import { uid, addMonths } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildingToRow,
  contractToRow,
  invoiceToRow,
  officeDetailsToRow,
} from "@/lib/supabase/mappers";
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

  // keep the legacy client.office link in sync during the transition
  if (input.officeNo) {
    await supabase
      .from("clients")
      .update({ office: input.officeNo, type: input.clientType })
      .eq("id", input.clientId);
  }

  return contract;
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
