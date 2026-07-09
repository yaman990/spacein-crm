// Commercial-Registration (Sijilat) helpers: normalise the registry status,
// derive a single "health" state for a client's CR, and parse the CSV that the
// Sijilat lookup produces so it can be imported in bulk.

export type CrLevel = "valid" | "expiring" | "expired" | "inactive" | "none";

/** Digits of the base CR (branch suffix like "-1" dropped). */
export function baseDigits(cr?: string | null): string {
  return String(cr ?? "")
    .split("-")[0]
    .replace(/\D/g, "");
}

// Arabic status text as returned by the Sijilat public search → English label.
const STATUS_EN: Record<string, string> = {
  "نشط": "Active",
  "موقوف بسبب عدم تجديد السجل التجاري": "Suspended — CR not renewed",
  "ملغي مع استيفاء شروط الإلغاء": "Cancelled",
  "ملغي مع استيفاء شروط الالغاء بدون ترخيص": "Cancelled — no license",
  "تم تصفية المنشأة": "Entity liquidated",
  "تحت الحجز التحفظي": "Under precautionary seizure",
  "سجل نشط دون ترخيص": "Active — no license",
  "سجل دون ترخيص موقوف بسبب عدم تجديد السجل التجاري":
    "No license + suspended",
};

/** Map a raw Sijilat status (Arabic or already-English) to an English label. */
export function normalizeCrStatus(raw?: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return STATUS_EN[s] ?? s;
}

const INACTIVE_RE =
  /(suspend|cancel|liquidat|seiz|no license|without license|struck|dissolv|موقوف|ملغي|تصفية|حجز|دون ترخيص|منقض)/i;

/** A CR counts as "active" unless its status text clearly says otherwise. */
export function isCrActive(status?: string | null): boolean {
  const s = (status ?? "").trim();
  if (!s) return true; // unknown — don't flag on status alone
  return !INACTIVE_RE.test(s);
}

/** dd/mm/yyyy (Sijilat) → yyyy-mm-dd (ISO, what we store). */
export function crDateToIso(value?: string | null): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // already ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(iso + "T00:00:00").getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / 86400000);
}

/**
 * Single source of truth for a client's CR health, combining the registry
 * status (suspended/cancelled can't be inferred from a date) with the expiry
 * date. `warnDays` controls the "expiring soon" window.
 */
export function crRegistryState(
  client: { crExpiry?: string | null; crStatus?: string | null },
  warnDays = 60,
): { level: CrLevel; label: string; days: number | null } {
  const status = (client.crStatus ?? "").trim();
  const days = daysUntil(client.crExpiry);

  if (status && !isCrActive(status)) {
    return { level: "inactive", label: status, days };
  }
  if (days === null) {
    if (status) return { level: "valid", label: "Active", days: null };
    return { level: "none", label: "No date", days: null };
  }
  if (days < 0) return { level: "expired", label: "Expired", days };
  if (days <= warnDays)
    return { level: "expiring", label: `${days}d left`, days };
  return { level: "valid", label: `${days}d`, days };
}

export interface SijilatRecord {
  crNumber: string;
  expiry: string; // ISO
  statusEn: string;
  nameEn: string;
  nameAr: string;
}

/** Parse a single CSV line respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Parse the Sijilat export CSV (as produced by the browser lookup tool).
 * Tolerant of the BOM, quoted fields and rows with zero matches.
 */
export function parseSijilatCsv(text: string): SijilatRecord[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  // Split into records, honouring newlines inside quoted fields.
  const rows: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '"') depth ^= 1;
    else if (clean[i] === "\n" && !depth) {
      rows.push(clean.slice(start, i));
      start = i + 1;
    }
  }
  if (start < clean.length) rows.push(clean.slice(start));

  const lines = rows.filter((r) => r.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iCr =
    col("cr_number") >= 0 ? col("cr_number") : col("CR_NO");
  const iExp = col("EXPIRE_DATE");
  const iSt = col("STATUS");
  const iEn = col("CR_LNM");
  const iAr = col("CR_ANM");
  const iMatch = col("matches");

  const records: SijilatRecord[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");
    if (iMatch >= 0 && (get(iMatch) === "0" || get(iMatch) === "")) continue;
    const crNumber = get(iCr);
    if (!crNumber) continue;
    records.push({
      crNumber,
      expiry: crDateToIso(get(iExp)),
      statusEn: normalizeCrStatus(get(iSt)),
      nameEn: get(iEn),
      nameAr: get(iAr),
    });
  }
  return records;
}
