/**
 * Phase 1 migration: convert the 125 clients that occupy an office into
 * office Contracts (+ their current Invoice). Clients with NO office are left
 * untouched (per decision). Existing client records are kept as-is.
 *
 *   DRY_RUN=1 npx tsx scripts/migrate-clients-to-contracts.ts   # validate only
 *   npx tsx scripts/migrate-clients-to-contracts.ts             # write rows
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or SB_URL/SB_KEY).
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SB_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SB_KEY;
const DRY = process.env.DRY_RUN === "1";

if (!url || !key) {
  console.error("Missing Supabase env (URL / service key)");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

type FloorsMap = Record<
  string,
  { sections: { offices: { no: string }[] }[] }
>;

function buildOfficeIndex(floors: FloorsMap): Map<string, string> {
  const idx = new Map<string, string>(); // officeNo -> floorKey
  for (const [fk, floor] of Object.entries(floors)) {
    for (const sec of floor.sections) {
      for (const o of sec.offices) idx.set(String(o.no).trim(), fk);
    }
  }
  return idx;
}

function hasOffice(office: string | null): boolean {
  const o = (office || "").trim();
  return !!o && o !== "-" && o !== "—";
}

async function main() {
  const [{ data: clients, error: cErr }, { data: settings, error: sErr }] =
    await Promise.all([
      sb.from("clients").select("*"),
      sb.from("crm_settings").select("key, value"),
    ]);
  if (cErr) throw new Error("clients: " + cErr.message);
  if (sErr) throw new Error("settings: " + sErr.message);

  const floorsRow = (settings || []).find((r) => r.key === "floors");
  const floors = (floorsRow?.value || {}) as FloorsMap;
  const officeIndex = buildOfficeIndex(floors);

  const withOffice = (clients || []).filter((c) => hasOffice(c.office));
  const noOffice = (clients || []).length - withOffice.length;

  const contracts: Record<string, unknown>[] = [];
  const invoices: Record<string, unknown>[] = [];
  const unmatchedOffices: string[] = [];
  let paidCount = 0;

  withOffice.forEach((c, i) => {
    const officeNo = String(c.office).trim();
    const floorKey = officeIndex.get(officeNo) ?? null;
    if (!floorKey) unmatchedOffices.push(officeNo);

    const months = Number(c.rent_months) || 12;
    const monthlyRent =
      c.monthly_rent != null
        ? Number(c.monthly_rent)
        : c.amount && months
          ? Number(c.amount) / months
          : Number(c.amount) || 0;
    const amount = Number(c.amount) || monthlyRent * months;
    const startDate = c.rent_start || c.join_date || null;
    const endDate = c.rent_end || c.due_date || null;
    // `rank` holds the CR number in this dataset → has CR = commercial.
    // (Ignore clients.type here: the ALTER set it to the 'commercial' default
    // for every legacy row, so CR presence is the real signal.)
    const crNo = (c.rank || "").trim();
    const clientType = crNo && crNo !== "-" ? "commercial" : "individual";
    const isPaid = c.status === "paid";
    if (isPaid) paidCount++;

    const contractId = randomUUID();
    contracts.push({
      id: contractId,
      contract_no: `C-${String(i + 1).padStart(4, "0")}`,
      client_id: c.id,
      floor_key: floorKey,
      office_no: officeNo,
      client_type: clientType,
      monthly_rent: Math.round(monthlyRent * 1000) / 1000,
      months,
      renewal_months: months,
      discount_value: 0,
      discount_kind: "fixed",
      discount_scope: "this_period",
      start_date: startDate,
      end_date: endDate,
      end_action: "auto_renew",
      status: "active",
      renewal_count: 0,
      created_by_staff_id: null,
    });
    invoices.push({
      id: randomUUID(),
      contract_id: contractId,
      period_start: startDate,
      period_end: endDate,
      amount: Math.round(amount * 1000) / 1000,
      status: isPaid ? "paid" : "issued",
      paid_at: c.paid_at || null,
      paid_by_staff_id: null,
      receipt_path: null,
    });
  });

  console.log(`clients total:            ${(clients || []).length}`);
  console.log(`  with office -> contract: ${withOffice.length}`);
  console.log(`  no office   -> skipped:  ${noOffice}`);
  console.log(`invoices (paid/issued):    ${paidCount}/${invoices.length - paidCount}`);
  console.log(
    `offices not found in floors: ${unmatchedOffices.length}` +
      (unmatchedOffices.length ? " -> " + unmatchedOffices.join(", ") : ""),
  );
  console.log("sample contract:", JSON.stringify(contracts[0], null, 2));

  if (DRY) {
    console.log("\nDRY RUN — no rows written.");
    return;
  }

  // guard against double-migration
  const { count } = await sb
    .from("contracts")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`\ncontracts table already has ${count} rows — aborting to avoid duplicates.`);
    return;
  }

  for (let i = 0; i < contracts.length; i += 100) {
    const cSlice = contracts.slice(i, i + 100);
    const { error } = await sb.from("contracts").insert(cSlice);
    if (error) throw new Error("insert contracts: " + error.message);
  }
  for (let i = 0; i < invoices.length; i += 100) {
    const iSlice = invoices.slice(i, i + 100);
    const { error } = await sb.from("invoices").insert(iSlice);
    if (error) throw new Error("insert invoices: " + error.message);
  }
  console.log(`\n✓ Wrote ${contracts.length} contracts and ${invoices.length} invoices.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
