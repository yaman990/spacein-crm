import { printHtmlA4 } from "@/lib/document-print";
import { reportTotals, type ReportColumn, type ReportRow } from "@/lib/reports";

function cellText(v: string | number | undefined, numeric?: boolean): string {
  if (v == null) return "";
  if (typeof v === "number") return numeric ? v.toFixed(3) : String(v);
  return v;
}

/** Download the report as a CSV that Excel opens (UTF-8 BOM for Arabic names). */
export function downloadReportCsv(
  fileName: string,
  columns: ReportColumn[],
  rows: ReportRow[],
) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const line = (r: ReportRow) =>
    columns
      .map((c) => {
        const v = r[c.key];
        // Keep numbers raw so Excel treats the column as numeric.
        return typeof v === "number" ? String(v) : esc(String(v ?? ""));
      })
      .join(",");
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map(line);
  const totals = reportTotals(columns, rows);
  if (totals) body.push(line(totals));
  const csv = "﻿" + [header, ...body].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const escHtml = (s: string) =>
  s.replace(/[&<>]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;",
  );

/** Render the report as an A4 landscape page and open the print dialog (Save as PDF). */
export function printReportPdf(
  title: string,
  subtitle: string,
  columns: ReportColumn[],
  rows: ReportRow[],
) {
  const th = columns
    .map(
      (c) =>
        `<th style="text-align:${c.numeric ? "right" : "left"}">${escHtml(c.label)}</th>`,
    )
    .join("");
  const trs = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => {
            const disp = cellText(r[c.key], c.numeric);
            return `<td style="text-align:${c.numeric ? "right" : "left"}">${escHtml(disp)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const totals = reportTotals(columns, rows);
  const tfoot = totals
    ? `<tfoot><tr>${columns
        .map(
          (c) =>
            `<td style="text-align:${c.numeric ? "right" : "left"};font-weight:700;background:#f3f4f6">${escHtml(cellText(totals[c.key], c.numeric))}</td>`,
        )
        .join("")}</tr></tfoot>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color:#111827; font-size:11px; margin:0; }
    h1 { font-size:18px; margin:0 0 2px; }
    .sub { color:#6b7280; font-size:11px; margin:0 0 12px; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #e5e7eb; padding:5px 7px; vertical-align:top; }
    th { background:#f3f4f6; text-transform:uppercase; font-size:9px; letter-spacing:.04em; color:#374151; }
    tbody tr:nth-child(even) td { background:#fafafa; }
    .foot { margin-top:10px; color:#9ca3af; font-size:10px; }
  </style></head><body>
    <h1>${escHtml(title)}</h1>
    <p class="sub">${escHtml(subtitle)}</p>
    <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody>${tfoot}</table>
    <p class="foot">${rows.length} row${rows.length === 1 ? "" : "s"} · Space IN Business Center</p>
  </body></html>`;

  printHtmlA4(html);
}
