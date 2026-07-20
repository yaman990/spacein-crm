"use server";

import { auth } from "@/lib/auth";
import { uid } from "@/lib/format";
import {
  persistOfficeOverrideDelta,
  syncOfficeFromClient,
} from "@/lib/office-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clientToRow,
  mapToOverrideRows,
  overridesToMap,
  rowToActivity,
  rowToBuilding,
  rowToClient,
  rowToContract,
  rowToInvoice,
  rowToPayment,
  rowToOfficeDetails,
  rowsToFloors,
} from "@/lib/supabase/mappers";
import { overlayClientBilling } from "@/lib/client-billing";
import type { ActivityType } from "@/types/activity";
import type { Client, ClientInput, ClientStatus } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";
import type {
  Building,
  Contract,
  Invoice,
  OfficeDetails,
  Payment,
} from "@/types/contract";
import defaultFloors from "@/data/default-floors.json";

/**
 * Reads the contract-workflow tables. Resilient by design: if the tables don't
 * exist yet (before the Phase 1 migration is applied), it returns empties
 * instead of throwing, so the rest of the dashboard keeps working.
 */
async function fetchContractsResilient(): Promise<{
  contracts: Contract[];
  invoices: Invoice[];
  payments: Payment[];
  officeDetails: OfficeDetails[];
  building: Building | null;
}> {
  const supabase = createAdminClient();
  const [contractsRes, invoicesRes, paymentsRes, detailsRes, buildingRes] =
    await Promise.all([
      supabase.from("contracts").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("office_details").select("*"),
      supabase.from("buildings").select("*").limit(1),
    ]);
  return {
    contracts: contractsRes.error
      ? []
      : (contractsRes.data ?? []).map(rowToContract),
    invoices: invoicesRes.error
      ? []
      : (invoicesRes.data ?? []).map(rowToInvoice),
    payments: paymentsRes.error
      ? []
      : (paymentsRes.data ?? []).map(rowToPayment),
    officeDetails: detailsRes.error
      ? []
      : (detailsRes.data ?? []).map(rowToOfficeDetails),
    building:
      buildingRes.error || !buildingRes.data?.length
        ? null
        : rowToBuilding(buildingRes.data[0]),
  };
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function logActivity(
  type: ActivityType,
  cid: string,
  cname: string,
  description: string,
  amt: number | null = null,
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("activity_log").insert({
    id: uid(),
    type,
    cid,
    cname,
    description,
    amt,
    ts: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchCrmData(): Promise<{
  clients: Client[];
  activityLog: import("@/types/activity").ActivityLogEntry[];
  officeOverrides: OfficeOverrides;
  floors: FloorsMap;
  contracts: Contract[];
  invoices: Invoice[];
  payments: Payment[];
  officeDetails: OfficeDetails[];
  building: Building | null;
}> {
  await requireSession();
  const supabase = createAdminClient();

  const [clientsRes, logRes, overridesRes, settingsRes, contractsData] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .order("due_date", { ascending: true }),
      supabase
        .from("activity_log")
        .select("*")
        .order("ts", { ascending: false })
        .limit(500),
      supabase.from("office_overrides").select("key, value"),
      supabase.from("crm_settings").select("key, value"),
      fetchContractsResilient(),
    ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  return {
    // contracts are the source of truth for billing — overlay the client rows
    clients: overlayClientBilling(
      (clientsRes.data ?? []).map(rowToClient),
      contractsData.contracts,
      contractsData.invoices,
    ),
    activityLog: (logRes.data ?? []).map(rowToActivity),
    officeOverrides: overridesToMap(overridesRes.data ?? []),
    floors: rowsToFloors(
      (settingsRes.data ?? []).map((r) => ({
        key: r.key,
        value: r.value as FloorsMap,
      })),
      defaultFloors as FloorsMap,
    ),
    ...contractsData,
  };
}

export async function createClientAction(
  input: ClientInput,
): Promise<Client> {
  await requireSession();
  const supabase = createAdminClient();
  const id = input.id ?? uid();
  const client: Client = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    status: input.status ?? "pending",
  };

  const { error } = await supabase.from("clients").insert(clientToRow(client));
  if (error) throw new Error(error.message);

  const { clients, officeOverrides, floors } = await fetchCrmDataInternal();
  const nextOverrides = syncOfficeFromClient(
    client,
    clients,
    officeOverrides,
    floors,
    false,
  );
  await persistOfficeOverrideDelta(supabase, officeOverrides, nextOverrides);

  await logActivity(
    "created",
    id,
    client.name,
    `New client added: ${client.name} (${client.company || "—"})`,
    client.amount,
  );

  return client;
}

export async function updateClientAction(
  id: string,
  input: Partial<ClientInput>,
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");

  const merged = { ...rowToClient(existing), ...input, id };
  const { error } = await supabase
    .from("clients")
    .update(clientToRow(merged))
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { clients, officeOverrides, floors } = await fetchCrmDataInternal();
  const nextOverrides = syncOfficeFromClient(
    merged,
    clients.map((c) => (c.id === id ? merged : c)),
    officeOverrides,
    floors,
    false,
  );
  await persistOfficeOverrideDelta(supabase, officeOverrides, nextOverrides);

  await logActivity("created", id, merged.name, `Client updated: ${merged.name}`);
}

/**
 * Bulk-apply CR expiry/status updates from a Sijilat refresh. Only the two CR
 * columns are touched — everything else on the client is left untouched.
 */
export async function applyCrUpdatesAction(
  updates: { id: string; crExpiry?: string; crStatus?: string }[],
): Promise<number> {
  await requireSession();
  const supabase = createAdminClient();

  let applied = 0;
  for (const u of updates) {
    if (!u.id) continue;
    const patch: { cr_expiry?: string | null; cr_status?: string | null } = {};
    if (u.crExpiry !== undefined) patch.cr_expiry = u.crExpiry || null;
    if (u.crStatus !== undefined) patch.cr_status = u.crStatus || null;
    if (Object.keys(patch).length === 0) continue;
    const { error } = await supabase
      .from("clients")
      .update(patch)
      .eq("id", u.id);
    if (error) throw new Error(error.message);
    applied++;
  }

  await logActivity(
    "created",
    "",
    "Sijilat",
    `CR data refreshed for ${applied} client${applied === 1 ? "" : "s"}`,
  );
  return applied;
}

export async function deleteClientAction(id: string): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");

  // A client with a live contract can't be deleted — the contract would be
  // orphaned. Close the contract first (which frees the office).
  const { data: liveContracts } = await supabase
    .from("contracts")
    .select("contract_no")
    .eq("client_id", id)
    .in("status", ["reserved", "active", "renewal_await_payment", "expired"]);
  if (liveContracts && liveContracts.length > 0) {
    throw new Error(
      `This client has ${liveContracts.length} open contract(s) (${liveContracts
        .map((c) => c.contract_no)
        .join(", ")}) — close them from the Offices page first.`,
    );
  }

  const removed = rowToClient(existing);
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const { clients, officeOverrides, floors } = await fetchCrmDataInternal();
  const nextOverrides = syncOfficeFromClient(
    removed,
    clients.filter((c) => c.id !== id),
    officeOverrides,
    floors,
    true,
  );
  await persistOfficeOverrideDelta(supabase, officeOverrides, nextOverrides);

  await logActivity("created", id, removed.name, `Client deleted: ${removed.name}`);
}

export async function markPaidAction(id: string): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");

  // Contract-managed clients must be paid through the contract flow, which
  // requires uploading the transfer receipt — don't allow bypassing it here.
  const { data: liveContracts } = await supabase
    .from("contracts")
    .select("id")
    .eq("client_id", id)
    .in("status", ["reserved", "active", "renewal_await_payment", "expired"]);
  if (liveContracts && liveContracts.length > 0) {
    const { data: openInvoices } = await supabase
      .from("invoices")
      .select("id")
      .in(
        "contract_id",
        liveContracts.map((c) => c.id),
      )
      .eq("status", "issued")
      .limit(1);
    if (openInvoices && openInvoices.length > 0) {
      throw new Error(
        "This client has an open contract invoice — mark it paid from the Offices page (open the office, upload the transfer receipt).",
      );
    }
  }

  const paidAt = new Date().toISOString();
  const { error } = await supabase
    .from("clients")
    .update({ status: "paid" as ClientStatus, paid_at: paidAt })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const client = rowToClient(existing);
  await logActivity(
    "paid",
    id,
    client.name,
    `Payment received from ${client.name}`,
    client.amount,
  );
}

export async function saveOfficeOverridesAction(
  overrides: OfficeOverrides,
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const rows = mapToOverrideRows(overrides);
  if (rows.length === 0) return;
  const { error } = await supabase.from("office_overrides").upsert(rows);
  if (error) throw new Error(error.message);
}

export async function saveFloorsAction(floors: FloorsMap): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_settings").upsert({
    key: "floors",
    value: floors,
  });
  if (error) throw new Error(error.message);
}

export interface ResetSummary {
  clients: number;
  contracts: number;
  invoices: number;
  payments: number;
  offices: number;
}

/**
 * DESTRUCTIVE — admin only. Deletes every client, contract, invoice and payment
 * and empties all offices (occupancy flags reset; restricted offices are kept
 * restricted). The office layout, rates, building, users and settings stay.
 * Requires the exact confirmation phrase.
 */
export async function resetBusinessDataAction(
  confirm: string,
): Promise<ResetSummary> {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("Admin only");
  if (confirm !== "RESET DATA")
    throw new Error('Type "RESET DATA" to confirm.');

  const supabase = createAdminClient();

  const countOf = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const summary: ResetSummary = {
    clients: await countOf("clients"),
    contracts: await countOf("contracts"),
    invoices: await countOf("invoices"),
    payments: await countOf("payments"),
    offices: 0,
  };

  // Clear all deal data (order avoids leaving orphans mid-way).
  for (const table of ["payments", "invoices", "contracts", "clients"]) {
    const { error } = await supabase
      .from(table)
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  await supabase.from("activity_log").delete().not("id", "is", null);
  // Drop per-office rented/company overrides, but keep "restricted" ones.
  await supabase.from("office_overrides").delete().neq("value", "restricted");
  await supabase.from("crm_settings").delete().eq("key", "contract_reminders");

  // Empty every office: reset occupancy flags on the floor plan, keep structure.
  const { data: settingsRows } = await supabase
    .from("crm_settings")
    .select("key, value");
  const floors = rowsToFloors(
    (settingsRows ?? []).map((r) => ({
      key: r.key,
      value: r.value as FloorsMap,
    })),
    defaultFloors as FloorsMap,
  );
  const reset: FloorsMap = {};
  for (const [fk, floor] of Object.entries(floors)) {
    reset[fk] = {
      ...floor,
      sections: floor.sections.map((sec) => ({
        ...sec,
        offices: sec.offices.map((o) => {
          summary.offices++;
          return {
            ...o,
            st: o.st === "restricted" ? ("restricted" as const) : ("unrented" as const),
            co: "",
          };
        }),
      })),
    };
  }
  const { error: fErr } = await supabase
    .from("crm_settings")
    .upsert({ key: "floors", value: reset }, { onConflict: "key" });
  if (fErr) throw new Error(fErr.message);

  await logActivity(
    "created",
    "",
    session.user.name ?? "",
    `Business data reset — cleared ${summary.clients} clients, ${summary.contracts} contracts, ${summary.invoices} invoices; offices emptied`,
  );

  return summary;
}

export async function recordDocumentAction(
  id: string,
  type: "invoice" | "receipt",
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");
  const client = rowToClient(existing);

  if (type === "invoice" && client.status !== "paid") {
    const { error } = await supabase
      .from("clients")
      .update({ status: "sent" as ClientStatus })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  await logActivity(
    type === "receipt" ? "receipt" : "invoice",
    id,
    client.name,
    `${type === "receipt" ? "Receipt" : "Invoice"} generated for ${client.name}`,
    client.amount,
  );
}

export async function recordCommunicationAction(
  id: string,
  channel: "wa" | "email",
  messageType: string,
): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");
  const client = rowToClient(existing);
  const label = channel === "wa" ? "WhatsApp" : "Email";

  await logActivity(
    channel,
    id,
    client.name,
    `${label}: ${messageType} sent to ${client.name}`,
    messageType !== "receipt" ? client.amount : null,
  );
}

export async function saveOfficeEditAction(input: {
  floorKey: string;
  officeNo: string;
  status: string;
  company: string;
}): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();
  const { officeOverrides } = await fetchCrmDataInternal();
  const stKey = `${input.floorKey}_${input.officeNo}`;
  const coKey = `${input.floorKey}_${input.officeNo}_co`;
  const next = {
    ...officeOverrides,
    [stKey]: input.status,
    [coKey]: input.company,
  };
  await persistOfficeOverrideDelta(supabase, officeOverrides, next);
}

/** Internal fetch without auth — for server action chains */
async function fetchCrmDataInternal() {
  const supabase = createAdminClient();
  const [clientsRes, overridesRes, settingsRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("office_overrides").select("key, value"),
    supabase.from("crm_settings").select("key, value"),
  ]);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  return {
    clients: (clientsRes.data ?? []).map(rowToClient),
    officeOverrides: overridesToMap(overridesRes.data ?? []),
    floors: rowsToFloors(
      (settingsRes.data ?? []).map((r) => ({
        key: r.key,
        value: r.value as FloorsMap,
      })),
      defaultFloors as FloorsMap,
    ),
  };
}
