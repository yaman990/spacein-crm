import type { Client } from "@/types/client";
import { User } from "lucide-react";
import { bhd, fmtDate } from "@/lib/format";
import {
  buildInvoiceDocumentData,
  type DocumentType,
} from "@/lib/invoice-document";

export function InvoiceDocumentView({
  client,
  type,
}: {
  client: Client;
  type: DocumentType;
}) {
  const data = buildInvoiceDocumentData(client, type);

  return (
    <div
      className="mx-auto bg-white text-black shadow-lg"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 20mm 20mm",
      }}
    >
      <div className="mb-1 flex items-start">
        <div className="min-w-[190px]">
          <div
            className="text-[28px] font-black leading-none tracking-tight"
            style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
          >
            SPACEIN
          </div>
          <div className="mt-0.5 text-[9.5px] font-black uppercase tracking-[2.5px]">
            Business Center
          </div>
          <div className="mt-0.5 text-[9.5px] text-neutral-600">165431-1</div>
        </div>
        <div className="flex-1 pt-3 pl-4">
          <hr className="border-t-[1.5px] border-black" />
        </div>
      </div>

      <div className="my-4 text-center">
        <h1 className="inline-block text-xl font-bold underline">
          {data.isReceipt ? "Receipt" : "Invoice"}
        </h1>
        <div className="mt-1 text-xs font-bold text-red-700">
          Date: {data.dateStr}
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-500">{data.docNumber}</div>
      </div>

      {data.isReceipt && (
        <div className="my-2 text-center">
          <span
            className="inline-block rounded border-[3px] border-emerald-700 px-5 py-0.5 text-2xl font-black tracking-wider text-emerald-700"
            style={{ transform: "rotate(-7deg)" }}
          >
            PAID
          </span>
        </div>
      )}

      <div className="my-3 text-xs leading-relaxed">
        <div>
          <strong>
            To: {client.name}
            {client.company ? " — " + client.company : ""}
            {client.rank ? " -CR. No. " + client.rank : ""}
          </strong>
        </div>
        <div>Respectful Member at Space IN Business Center</div>
        <div>Manama Center - Kingdom of Bahrain</div>
        {client.phone && <div>Tel: {client.phone}</div>}
        {client.email && <div>Email: {client.email}</div>}
        {client.office && (
          <div>
            Office No: <strong>{client.office}</strong>
          </div>
        )}
        {client.joinDate && (
          <div>
            Member Since: <strong>{fmtDate(client.joinDate)}</strong>
          </div>
        )}
      </div>

      {client.rentedBy && (
        <div className="mb-2 flex items-center gap-1.5 rounded-r border-l-[3px] border-amber-500 bg-amber-50 px-2.5 py-1.5 text-[11px]">
          <User className="size-3.5 shrink-0 text-amber-800" aria-hidden />
          <span>
            <strong>Rented by:</strong> {client.rentedBy}
          </span>
        </div>
      )}

      <table className="my-2 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0f0e0b] text-white">
            <th className="w-10 border border-neutral-400 p-2 text-center">Sr</th>
            <th className="border border-neutral-400 p-2 text-center">
              Description
            </th>
            <th className="w-[120px] border border-neutral-400 p-2 text-center">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-neutral-300 p-2 text-center">1</td>
            <td className="border border-neutral-300 p-2 text-center">
              {data.descText}
              {data.isRent && client.rentMonths && client.rentMonths > 1 && (
                <>
                  <br />
                  <small className="text-[10px] text-neutral-600">
                    Monthly: {bhd(client.monthlyRent ?? 0)} x {client.rentMonths}{" "}
                    Months
                  </small>
                </>
              )}
            </td>
            <td className="border border-neutral-300 p-2 text-center font-bold">
              {data.amtText}
            </td>
          </tr>
          <tr className="bg-neutral-100">
            <td
              colSpan={2}
              className="border border-neutral-300 p-2 text-center font-bold"
            >
              TOTAL
            </td>
            <td className="border border-neutral-300 p-2 text-center font-bold">
              {data.amtText}
            </td>
          </tr>
        </tbody>
      </table>

      {!data.isReceipt ? (
        <>
          <div className="my-2 text-center text-xs font-bold underline">
            Payments Methods: Cash or Banking Transfer
          </div>
          <div className="mb-1 text-xs font-bold underline">
            Banking Transfer Details:
          </div>
          <div className="space-y-0.5 text-xs">
            <BankRow label="Bank Name:" value="Al Salam Bank (ALSA)" />
            <BankRow label="Account Name:" value="Space IN Business Center WLL" />
            <BankRow label="Swift Code:" value="ALSABHBM" />
            <BankRow label="Account Number:" value="806235100100" />
            <BankRow label="IBAN:" value="BH34ALSA00806235100100" />
          </div>
        </>
      ) : (
        <div className="mt-2 text-center text-[11px] text-neutral-600">
          Payment confirmed on {data.dateStr}. Thank you!
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="115"
          height="115"
          viewBox="0 0 130 130"
          aria-hidden
        >
          <circle cx="65" cy="65" r="61" fill="none" stroke="#1a56b0" strokeWidth="2" />
          <circle cx="65" cy="65" r="42" fill="none" stroke="#1a56b0" strokeWidth="1.5" />
          <path id="preview-arcTop" fill="none" d="M 10,65 A 55,55 0 0,1 120,65" />
          <text fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="800" fill="#1a56b0" letterSpacing="3.2">
            <textPath href="#preview-arcTop" startOffset="4%">
              SPACE IN BUSINESS CENTER
            </textPath>
          </text>
          <path id="preview-arcBot" fill="none" d="M 16,72 A 55,55 0 0,0 114,72" />
          <text fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="800" fill="#1a56b0" letterSpacing="4">
            <textPath href="#preview-arcBot" startOffset="32%">
              WLL
            </textPath>
          </text>
          <line x1="35" y1="68" x2="95" y2="68" stroke="#1a56b0" strokeWidth="1.4" />
          <text x="65" y="62" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="10.5" fontWeight="800" fill="#1a56b0">
            CR.165431-1
          </text>
        </svg>
      </div>
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="inline-block w-40 text-neutral-600">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
