import type { Client } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";

export function syncOfficeFromClient(
  client: Client,
  clients: Client[],
  overrides: OfficeOverrides,
  floors: FloorsMap,
  wasDeleted: boolean,
): OfficeOverrides {
  const office = client.office?.trim();
  if (!office || office === "-" || office === "—") return overrides;

  let matchFloor: string | null = null;
  for (const [fk, floor] of Object.entries(floors)) {
    for (const sec of floor.sections) {
      for (const o of sec.offices) {
        if (String(o.no).trim() === office) matchFloor = fk;
      }
    }
  }
  if (!matchFloor) return overrides;

  const next = { ...overrides };
  const stKey = `${matchFloor}_${office}`;
  const coKey = `${matchFloor}_${office}_co`;

  if (wasDeleted) {
    const other = clients.find(
      (c) => c.id !== client.id && String(c.office).trim() === office,
    );
    if (!other) {
      next[stKey] = "unrented";
      next[coKey] = "";
    }
  } else {
    next[stKey] = "rented";
    next[coKey] = client.company || client.name || "";
  }
  return next;
}

export async function persistOfficeOverrides(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  overrides: OfficeOverrides,
) {
  const rows = Object.entries(overrides).map(([key, value]) => ({
    key,
    value,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("office_overrides").upsert(rows);
  if (error) throw new Error(error.message);
}

/** Upsert only keys whose values changed */
export async function persistOfficeOverrideDelta(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  before: OfficeOverrides,
  after: OfficeOverrides,
) {
  const rows = Object.entries(after)
    .filter(([key, value]) => before[key] !== value)
    .map(([key, value]) => ({ key, value }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("office_overrides").upsert(rows);
  if (error) throw new Error(error.message);
}
