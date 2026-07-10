"use server";

import { auth } from "@/lib/auth";
import { baseDigits, crDateToIso, normalizeCrStatus } from "@/lib/cr-registry";

// Commercial-registration autofill. The CRM does NOT talk to Sijilat directly —
// it calls the operator's own lookup service (configured via SIJILAT_LOOKUP_URL),
// which returns the public CR record as JSON. Here we just fetch that endpoint
// and map its response onto the client form fields.

export interface CrLookupResult {
  crNumber: string;
  nameEnglish: string;
  nameArabic: string;
  companyType: string;
  registrationDate: string;
  expiry: string; // ISO yyyy-mm-dd
  status: string; // normalised English label
}

export async function retrieveCrAction(
  crNumber: string,
): Promise<CrLookupResult | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const base = process.env.SIJILAT_LOOKUP_URL;
  if (!base) {
    throw new Error(
      "CR lookup isn't set up yet — add your lookup service URL as SIJILAT_LOOKUP_URL.",
    );
  }

  const cr = baseDigits(crNumber); // digits only, branch suffix dropped
  if (!cr) throw new Error("Enter a CR number first.");

  const url = `${base}${base.includes("?") ? "&" : "?"}cr=${encodeURIComponent(cr)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error("Couldn't reach the CR lookup service.");
  }

  const data = (await res.json().catch(() => null)) as
    | { records?: unknown[]; error?: string }
    | null;
  if (!res.ok) throw new Error(data?.error || "CR lookup failed.");

  const rec = Array.isArray(data?.records)
    ? (data.records[0] as Record<string, unknown> | undefined)
    : undefined;
  if (!rec) return null;

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    crNumber: str(rec.crNumber) || cr,
    nameEnglish: str(rec.nameEnglish),
    nameArabic: str(rec.nameArabic),
    companyType: str(rec.companyType),
    registrationDate: str(rec.registrationDate),
    expiry: crDateToIso(str(rec.expiryDate)),
    status: normalizeCrStatus(str(rec.status)),
  };
}
