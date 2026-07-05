import type { Contract, OfficeDetails } from "@/types/contract";
import type { FloorsMap, OfficeOverrides } from "@/types/office";
import { resolveOfficeStatus } from "@/lib/office-stats";

/** Statuses shown on the floor map / office tile (derived from contracts). */
export type DerivedOfficeStatus =
  | "available"
  | "reserved"
  | "active"
  | "renewal"
  | "expired"
  | "shared"
  | "full"
  | "legacy" // occupied per the legacy floor data, but no contract yet
  | "restricted";

// contract statuses that still occupy a slot on the office
const OCCUPYING = new Set([
  "reserved",
  "active",
  "renewal_await_payment",
  "expired",
]);

export const detailsKey = (floorKey: string, officeNo: string) =>
  `${floorKey}_${officeNo}`;

export function officeDetailsMap(
  list: OfficeDetails[],
): Map<string, OfficeDetails> {
  const m = new Map<string, OfficeDetails>();
  for (const d of list) m.set(detailsKey(d.floorKey, d.officeNo), d);
  return m;
}

export interface OfficeOccupancy {
  floorKey: string;
  officeNo: string;
  capacity: number;
  multiTenant: boolean;
  used: number;
  contracts: Contract[]; // the occupying contracts on this office
  hasFreeSlot: boolean;
  status: DerivedOfficeStatus;
  /** Occupant recorded in the legacy floor data when no contract exists. */
  legacyOccupant?: string;
}

/**
 * Works out how an office should show, from its contracts + its details.
 * `legacyStatus` is the pre-contract 3-state (floor data + overrides):
 * "restricted" always wins; "rented" with no contract becomes the `legacy`
 * state so historical occupancy is never silently shown as available.
 */
export function deriveOccupancy(
  floorKey: string,
  officeNo: string,
  contracts: Contract[],
  detailsByKey: Map<string, OfficeDetails>,
  legacyStatus: "rented" | "unrented" | "restricted",
  legacyOccupant = "",
): OfficeOccupancy {
  const det = detailsByKey.get(detailsKey(floorKey, officeNo));
  const multiTenant = det?.multiTenant ?? false;
  const capacity = multiTenant ? Math.max(1, det?.capacity ?? 1) : 1;

  const occupying = contracts.filter(
    (c) =>
      c.floorKey === floorKey &&
      c.officeNo === officeNo &&
      OCCUPYING.has(c.status),
  );
  const used = occupying.length;
  const isLegacy = used === 0 && legacyStatus === "rented";
  const hasFreeSlot = used < capacity && !isLegacy;

  let status: DerivedOfficeStatus;
  if (legacyStatus === "restricted") status = "restricted";
  else if (isLegacy) status = "legacy";
  else if (used === 0) status = "available";
  else if (multiTenant && used < capacity) status = "shared";
  else if (occupying.some((c) => c.status === "renewal_await_payment"))
    status = "renewal";
  else if (occupying.some((c) => c.status === "expired")) status = "expired";
  else if (occupying.some((c) => c.status === "reserved")) status = "reserved";
  else status = multiTenant ? "full" : "active";

  return {
    floorKey,
    officeNo,
    capacity,
    multiTenant,
    used,
    contracts: occupying,
    hasFreeSlot,
    status,
    legacyOccupant: isLegacy ? legacyOccupant : undefined,
  };
}

/**
 * Office stats derived from contracts (plus legacy/restricted states) — the
 * single source used by the Offices page, Dashboard KPIs and Analytics so
 * every menu reports the same numbers.
 */
export function contractOfficeStats(
  floors: FloorsMap,
  overrides: OfficeOverrides,
  contracts: Contract[],
  detailsByKey: Map<string, OfficeDetails>,
) {
  let total = 0;
  let rented = 0;
  let free = 0;
  let restricted = 0;
  Object.entries(floors).forEach(([fk, floor]) =>
    floor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        if (!o.no || o.no === "—") return;
        total++;
        const legacyStatus = resolveOfficeStatus(fk, o.no, o.st, overrides);
        const occ = deriveOccupancy(
          fk,
          o.no,
          contracts,
          detailsByKey,
          legacyStatus,
        );
        if (occ.status === "restricted") restricted++;
        else if (occ.used > 0 || occ.status === "legacy") rented++;
        else free++;
      }),
    ),
  );
  return {
    total,
    rented,
    free,
    restricted,
    rate: total > 0 ? Math.round((rented / total) * 100) : 0,
  };
}

/** Term (months) → the office's per-term rate, if set. */
export function rateForTerm(
  det: OfficeDetails | undefined,
  months: number,
): number | undefined {
  if (!det) return undefined;
  if (months <= 3) return det.rate3;
  if (months <= 6) return det.rate6;
  if (months <= 9) return det.rate9;
  return det.rate12;
}
