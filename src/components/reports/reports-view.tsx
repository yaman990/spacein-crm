"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useCrm } from "@/providers/crm-provider";
import {
  REPORTS,
  getReport,
  reportTotals,
  type ReportContext,
} from "@/lib/reports";
import { downloadReportCsv, printReportPdf } from "@/lib/report-export";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PREVIEW_LIMIT = 200;

export function ReportsView() {
  const {
    clients,
    contracts,
    invoices,
    payments,
    floors,
    officeOverrides,
    officeDetails,
    isHydrated,
  } = useCrm();
  const today = new Date().toISOString().slice(0, 10);

  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const def = getReport(reportKey);

  const allRows = useMemo(() => {
    const ctx: ReportContext = {
      clients,
      contracts,
      invoices,
      payments,
      floors,
      officeOverrides,
      officeDetails,
      from,
      to,
      today,
    };
    return def.build(ctx);
  }, [
    def,
    clients,
    contracts,
    invoices,
    payments,
    floors,
    officeOverrides,
    officeDetails,
    from,
    to,
    today,
  ]);

  const rows = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return allRows;
    return allRows.filter((r) =>
      def.columns.some((c) =>
        String(r[c.key] ?? "").toLowerCase().includes(query),
      ),
    );
  }, [allRows, q, def]);

  const totals = useMemo(() => reportTotals(def.columns, rows), [def, rows]);

  const fileName = `SpaceIN_${def.name.replace(/\s+/g, "_")}_${today}`;
  const subtitle = [
    def.description,
    def.usesDates && (from || to) ? `${from || "start"} → ${to || "today"}` : "",
    `generated ${fmtDate(today)}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  if (!isHydrated) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <Label className="text-xs">Report</Label>
          <Select
            value={reportKey}
            onValueChange={(v) => setReportKey(v ?? REPORTS[0].key)}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORTS.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {def.usesDates && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
          </>
        )}

        <div className="min-w-[180px] flex-1 space-y-1">
          <Label className="text-xs">Search</Label>
          <Input
            placeholder="client / office / contract…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={rows.length === 0}
            onClick={() => downloadReportCsv(fileName, def.columns, rows)}
          >
            <Download className="mr-1.5 size-4" /> Excel
          </Button>
          <Button
            disabled={rows.length === 0}
            onClick={() => printReportPdf(def.name, subtitle, def.columns, rows)}
          >
            <Printer className="mr-1.5 size-4" /> PDF
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {def.description} — <span className="font-medium">{rows.length}</span>{" "}
        row{rows.length === 1 ? "" : "s"}
      </p>

      <Card className="shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/70 backdrop-blur">
              <TableRow>
                {def.columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={c.numeric ? "text-right" : undefined}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={def.columns.length}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No data for this report / filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                  <TableRow key={i}>
                    {def.columns.map((c) => {
                      const v = r[c.key];
                      const text =
                        typeof v === "number"
                          ? c.numeric
                            ? v.toFixed(3)
                            : String(v)
                          : (v ?? "");
                      return (
                        <TableCell
                          key={c.key}
                          className={
                            c.numeric
                              ? "whitespace-nowrap text-right font-mono text-sm tabular-nums"
                              : "text-sm"
                          }
                        >
                          {text || "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
              {totals && rows.length > 0 && (
                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  {def.columns.map((c) => {
                    const v = totals[c.key];
                    const text =
                      typeof v === "number"
                        ? c.numeric
                          ? v.toFixed(3)
                          : String(v)
                        : (v ?? "");
                    return (
                      <TableCell
                        key={c.key}
                        className={
                          c.numeric
                            ? "whitespace-nowrap text-right font-mono text-sm tabular-nums"
                            : "text-sm"
                        }
                      >
                        {text}
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {rows.length > PREVIEW_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing first {PREVIEW_LIMIT} of {rows.length} rows — the Excel / PDF
          export includes all {rows.length}.
        </p>
      )}
    </div>
  );
}
