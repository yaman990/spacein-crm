"use server";

import { createHmac } from "node:crypto";
import { auth } from "@/lib/auth";
import { crDateToIso, normalizeCrStatus } from "@/lib/cr-registry";

const SIJILAT_API_BASE = "https://api.sijilat.bh";
const SIJILAT_PASSWORD_SECRET = "UHxNtYMRYwvfpO1dS5pWLKL0M2DgOj40EbN4SoBWgfc";
const SIJILAT_PUBLIC_PASSWORD = "sijilat_test";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export interface CrLookupResult {
  crNumber: string;
  branchNumber: string;
  nameEnglish: string;
  nameArabic: string;
  companyType: string;
  registrationDate: string;
  expiry: string; // ISO yyyy-mm-dd
  status: string; // normalised English label
}

interface SijilatTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface SijilatRecord {
  CR_NO?: string;
  BRANCH_NO?: string | number;
  CR_LNM?: string;
  CR_ANM?: string;
  CM_TYP_DESC?: string;
  REG_DATE?: string;
  EXPIRE_DATE?: string;
  STATUS?: string;
}

interface SijilatSearchResponse {
  Status_Code?: string;
  Status_Message?: string;
  jsonData?:
    | {
        CR_list?: SijilatRecord[];
      }
    | string;
}

function parseCrInput(value: string): {
  crNumber: string;
  branchNumber: string;
} {
  const [crPart = "", branchPart = ""] = value.trim().split("-");
  return {
    crNumber: crPart.replace(/\D/g, ""),
    branchNumber: branchPart.replace(/\D/g, ""),
  };
}

function publicTokenPassword() {
  return createHmac("sha256", SIJILAT_PASSWORD_SECRET)
    .update(SIJILAT_PUBLIC_PASSWORD)
    .digest("hex");
}

async function getSijilatToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    username: "sijilat",
    password: publicTokenPassword(),
    grant_type: "password",
  });

  const res = await fetch(`${SIJILAT_API_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as
    | SijilatTokenResponse
    | null;
  if (!res.ok || !data?.access_token) {
    throw new Error("Could not connect to Sijilat.");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 300) * 1000,
  };

  return cachedToken.accessToken;
}

function searchBody(crNumber: string) {
  return {
    draw: 1,
    columns: [],
    order: [],
    start: 0,
    length: 1000,
    search: { value: "", regex: false },
    CR_NO: crNumber,
    CR_LNM: "",
    CR_ANM: "",
    CM_TYP_CD: "",
    STATUS: "",
    CR_MUNCP_CD: "",
    CR_BLOCK: "",
    CM_NAT_CD: "",
    FIRST_LEV: "",
    PTNER_LNM: "",
    PTNER_ANM: "",
    PTNER_NAT_CD: "",
    REG_DATE_FROM: "",
    REG_DATE_TO: "",
    CR_ROAD: "",
    CR_FLAT: "",
    CR_BULD: "",
    PSPORT_NO: "",
    PTNER_CR_NO: "",
    VCR_YN: "",
    ISIC4_CD: "",
    CurrentMenuType: "A",
    cpr_no: "",
    CULT_LANG: "EN",
    PaginationParams: {
      Page: 1,
      ItemPerPage: 1000,
    },
  };
}

function chooseRecord(records: SijilatRecord[], branchNumber: string) {
  if (branchNumber) {
    const exact = records.find((r) => String(r.BRANCH_NO ?? "") === branchNumber);
    if (exact) return exact;
  }

  const active = records.filter(
    (r) => normalizeCrStatus(r.STATUS).toLowerCase() === "active",
  );

  return (
    active.find((r) => String(r.BRANCH_NO ?? "") === "1") ??
    active[0] ??
    records.find((r) => String(r.BRANCH_NO ?? "") === "1") ??
    records[0]
  );
}

export async function retrieveCrAction(
  crInput: string,
): Promise<CrLookupResult | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { crNumber, branchNumber } = parseCrInput(crInput);
  if (!crNumber) throw new Error("Enter a CR number first.");

  const token = await getSijilatToken();
  const res = await fetch(
    `${SIJILAT_API_BASE}/api/CRdetails/AdvanceSearchCR_Paging`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(searchBody(crNumber)),
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => null)) as
    | SijilatSearchResponse
    | null;
  if (!res.ok || data?.Status_Code !== "200") {
    const message =
      typeof data?.jsonData === "string"
        ? data.jsonData
        : data?.Status_Message || "CR lookup failed.";
    throw new Error(message);
  }

  const records =
    data.jsonData &&
    typeof data.jsonData !== "string" &&
    Array.isArray(data.jsonData.CR_list)
      ? data.jsonData.CR_list
      : [];
  const record = chooseRecord(records, branchNumber);
  if (!record) return null;

  const selectedBranch = String(record.BRANCH_NO ?? branchNumber || "");

  return {
    crNumber: String(record.CR_NO ?? crNumber),
    branchNumber: selectedBranch,
    nameEnglish: String(record.CR_LNM ?? ""),
    nameArabic: String(record.CR_ANM ?? ""),
    companyType: String(record.CM_TYP_DESC ?? ""),
    registrationDate: String(record.REG_DATE ?? ""),
    expiry: crDateToIso(String(record.EXPIRE_DATE ?? "")),
    status: normalizeCrStatus(String(record.STATUS ?? "")),
  };
}
