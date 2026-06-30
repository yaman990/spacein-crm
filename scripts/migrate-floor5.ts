/**
 * One-time migration: switch the stored office data from the old per-flat
 * structure (bank5 / rec5 / round5) to the unified `floor5` used by the CAD
 * floor-plan map.
 *
 *  1. Overwrites crm_settings.floors with the current default-floors.json.
 *  2. Re-keys office_overrides:  bank5_/rec5_/round5_<no>[ _co ]  ->  floor5_<no>[ _co ]
 *     for office numbers 501–599, so rented statuses / company names are kept.
 *  3. Drops the now-orphaned old-flat override rows. (round4_* is left untouched.)
 *
 * Run it the same way as the seed, against the target database:
 *     npx tsx scripts/migrate-floor5.ts
 * (reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local)
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const OLD_PREFIXES = ["bank5", "rec5", "round5"];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1) floors setting -------------------------------------------------------
  const floorsPath = resolve(process.cwd(), "src/data/default-floors.json");
  const floors = JSON.parse(readFileSync(floorsPath, "utf8"));
  const { error: floorsErr } = await supabase
    .from("crm_settings")
    .upsert({ key: "floors", value: floors }, { onConflict: "key" });
  if (floorsErr) throw new Error(`floors upsert failed: ${floorsErr.message}`);
  console.log(`✓ floors setting updated → keys: ${Object.keys(floors).join(", ")}`);

  // 2) office_overrides re-key ---------------------------------------------
  const { data: rows, error: ovrErr } = await supabase
    .from("office_overrides")
    .select("key, value");
  if (ovrErr) throw new Error(`overrides read failed: ${ovrErr.message}`);

  const remapped = new Map<string, string>(); // newKey -> value
  const oldKeysToDelete: string[] = [];

  for (const { key: k, value } of rows ?? []) {
    const us = k.indexOf("_");
    if (us < 0) continue;
    const prefix = k.slice(0, us);
    const rest = k.slice(us + 1); // e.g. "503" or "503_co"
    if (!OLD_PREFIXES.includes(prefix)) continue; // leave round4_* etc.

    oldKeysToDelete.push(k);
    const no = Number(rest.split("_")[0]);
    if (no < 501 || no > 599) continue; // 4xx etc. — drop, no floor5 equivalent

    const newKey = `floor5_${rest}`;
    const prev = remapped.get(newKey);
    // prefer a meaningful value if two old flats both had this office
    const better = prev === undefined || (!prev && value) || (prev !== "rented" && value === "rented");
    if (better) remapped.set(newKey, value);
  }

  if (remapped.size > 0) {
    const upsertRows = [...remapped].map(([k, value]) => ({ key: k, value }));
    const { error } = await supabase
      .from("office_overrides")
      .upsert(upsertRows, { onConflict: "key" });
    if (error) throw new Error(`overrides upsert failed: ${error.message}`);
  }
  if (oldKeysToDelete.length > 0) {
    const { error } = await supabase
      .from("office_overrides")
      .delete()
      .in("key", oldKeysToDelete);
    if (error) throw new Error(`overrides delete failed: ${error.message}`);
  }

  console.log(
    `✓ office_overrides re-keyed → ${remapped.size} moved to floor5_, ${oldKeysToDelete.length} old rows removed`,
  );
  console.log("Done. Reload the Offices page — Floor 5 will show the floor-plan map.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
