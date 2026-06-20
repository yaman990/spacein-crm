import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { clientToRow } from "../src/lib/supabase/mappers";
import {
  ensureRootAdminRecord,
  ROOT_ADMIN_EMAIL,
} from "../src/lib/crm-users";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  await ensureRootAdminRecord({
    email: ROOT_ADMIN_EMAIL,
    password: process.env.ROOT_ADMIN_PASSWORD || "admin123",
    name: "Root Admin",
  });
  console.log(`Ensured root admin ${ROOT_ADMIN_EMAIL}`);

  const { count, error: countErr } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);

  if ((count ?? 0) === 0) {
    const clientsPath = resolve(process.cwd(), "src/data/preloaded-clients.json");
    const clients = JSON.parse(readFileSync(clientsPath, "utf8")) as Record<
      string,
      unknown
    >[];
    const rows = clients.map((c) =>
      clientToRow({
        id: String(c.id),
        name: String(c.name),
        company: String(c.company ?? ""),
        rank: String(c.rank ?? ""),
        office: String(c.office ?? ""),
        phone: String(c.phone ?? ""),
        email: String(c.email ?? ""),
        rentedBy: String(c.rentedBy ?? ""),
        notes: String(c.notes ?? ""),
        joinDate: String(c.joinDate ?? ""),
        dueDate: String(c.dueDate ?? ""),
        amount: Number(c.amount ?? 0),
        invoiceType:
          (c.invoiceType as "subscription" | "rent") ?? "subscription",
        rentMonths: c.rentMonths as number | undefined,
        status: (c.status as "pending") ?? "pending",
        createdAt: String(c.createdAt ?? new Date().toISOString()),
      }),
    );

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("clients").insert(batch);
      if (error) throw new Error(error.message);
      console.log(`Inserted clients ${i + 1}-${i + batch.length}`);
    }
  } else {
    console.log(`Clients table already has ${count} rows — skipping seed`);
  }

  const floorsPath = resolve(process.cwd(), "src/data/default-floors.json");
  const floors = JSON.parse(readFileSync(floorsPath, "utf8"));
  const { data: floorsSetting } = await supabase
    .from("crm_settings")
    .select("key")
    .eq("key", "floors")
    .maybeSingle();

  if (!floorsSetting) {
    const { error } = await supabase
      .from("crm_settings")
      .insert({ key: "floors", value: floors });
    if (error) throw new Error(error.message);
    console.log("Seeded default floors");
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
