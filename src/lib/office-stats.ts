import type { Client } from "@/types/client";
import type { FloorsMap, OfficeOverrides, OfficeStatus } from "@/types/office";

export function resolveOfficeStatus(
  floorKey: string,
  officeNo: string,
  defaultStatus: OfficeStatus,
  overrides: OfficeOverrides,
): OfficeStatus {
  const st = overrides[`${floorKey}_${officeNo}`];
  if (st === "rented" || st === "unrented" || st === "restricted") return st;
  return defaultStatus;
}

export function resolveOfficeCompany(
  floorKey: string,
  officeNo: string,
  defaultCo: string,
  overrides: OfficeOverrides,
  clients: Client[],
): { company: string; linkedClient: Client | null } {
  const coKey = `${floorKey}_${officeNo}_co`;
  const liveClient =
    officeNo !== "—"
      ? clients.find((c) => String(c.office).trim() === String(officeNo).trim()) ??
        null
      : null;
  const company =
    overrides[coKey] || (liveClient ? liveClient.company : defaultCo) || "";
  return { company, linkedClient: liveClient };
}

export function globalOfficeStats(
  floors: FloorsMap,
  overrides: OfficeOverrides,
) {
  let total = 0;
  let rented = 0;
  let free = 0;
  let restricted = 0;
  Object.entries(floors).forEach(([fk, floor]) => {
    floor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        total++;
        const st = resolveOfficeStatus(fk, o.no, o.st, overrides);
        if (st === "rented") rented++;
        else if (st === "restricted") restricted++;
        else free++;
      }),
    );
  });
  return {
    total,
    rented,
    free,
    restricted,
    rate: total > 0 ? Math.round((rented / total) * 100) : 0,
  };
}
