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
  rowToClient,
  rowsToFloors,
} from "@/lib/supabase/mappers";
import type { ActivityType } from "@/types/activity";
import type { Client, ClientInput, ClientStatus } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";
import defaultFloors from "@/data/default-floors.json";

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
}> {
  await requireSession();
  const supabase = createAdminClient();

  const [clientsRes, logRes, overridesRes, settingsRes] = await Promise.all([
    supabase.from("clients").select("*").order("due_date", { ascending: true }),
    supabase
      .from("activity_log")
      .select("*")
      .order("ts", { ascending: false })
      .limit(500),
    supabase.from("office_overrides").select("key, value"),
    supabase.from("crm_settings").select("key, value"),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);

  return {
    clients: (clientsRes.data ?? []).map(rowToClient),
    activityLog: (logRes.data ?? []).map(rowToActivity),
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

export async function deleteClientAction(id: string): Promise<void> {
  await requireSession();
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) throw new Error("Client not found");

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
