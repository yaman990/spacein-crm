"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCrm } from "@/providers/crm-provider";
import { bhd, fmtDate } from "@/lib/format";
import type { Invoice } from "@/types/contract";
import { InvoiceRow } from "@/components/contracts/contract-detail-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Filter = "owing" | "overdue" | "closed" | "paid" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "owing", label: "Owing" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed & owing" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
];

export function InvoicesView() {
  const {
    invoices,
    payments,
    contracts,
    clients,
    markInvoicePaid,
    recordPayment,
    getReceiptUrl,
    isHydrated,
  } = useCrm();
  const today = new Date().toISOString().slice(0, 10);
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");
  const [filter, setFilter] = useState<Filter>(clientId ? "all" : "owing");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contractById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts],
  );
  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const rows = useMemo(() => {
    return invoices
      .map((inv) => {
        const contract = contractById.get(inv.contractId);
        const client = contract ? clientById.get(contract.clientId) : undefined;
        const remaining =
          inv.status === "void"
            ? 0
            : Math.max(0, inv.amount - (inv.paidAmount || 0));
        const overdue =
          remaining > 0 && !!inv.periodStart && inv.periodStart < today;
        return {
          inv,
          contract,
          client,
          office: contract?.officeNo ?? "—",
          remaining,
          overdue,
          isClosed: contract?.status === "closed",
        };
      })
      .sort((a, b) => {
        const rank = (r: typeof a) =>
          r.overdue ? 0 : r.remaining > 0 ? 1 : 2;
        return (
          rank(a) - rank(b) ||
          (a.inv.periodStart < b.inv.periodStart ? -1 : 1)
        );
      });
  }, [invoices, contractById, clientById, today]);

  const focusClient = clientId ? clientById.get(clientId) : null;
  const scoped = useMemo(
    () =>
      clientId ? rows.filter((r) => r.contract?.clientId === clientId) : rows,
    [rows, clientId],
  );

  const totals = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let collected = 0;
    for (const r of scoped) {
      collected += r.inv.paidAmount || 0;
      outstanding += r.remaining;
      if (r.overdue) overdue += r.remaining;
    }
    return { outstanding, overdue, collected };
  }, [scoped]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return scoped.filter((r) => {
      if (filter === "owing" && !(r.remaining > 0)) return false;
      if (filter === "overdue" && !r.overdue) return false;
      if (filter === "closed" && !(r.isClosed && r.remaining > 0)) return false;
      if (filter === "paid" && r.inv.status !== "paid") return false;
      if (query) {
        const hay =
          `${r.client?.company ?? ""} ${r.client?.name ?? ""} ${r.office} ${r.contract?.contractNo ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [scoped, filter, q]);

  const selected = selectedId
    ? invoices.find((i) => i.id === selectedId)
    : null;
  const selectedContract = selected
    ? contractById.get(selected.contractId)
    : undefined;
  const selectedClient = selectedContract
    ? clientById.get(selectedContract.clientId)
    : undefined;

  if (!isHydrated) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      {focusClient && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">
          <span>
            Showing invoices for{" "}
            <span className="font-semibold">
              {focusClient.company || focusClient.name}
            </span>
          </span>
          <Link
            href="/invoices"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Show all invoices
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Outstanding" value={bhd(totals.outstanding)} tone="warn" />
        <Stat label="Overdue" value={bhd(totals.overdue)} tone="crit" />
        <Stat label="Collected (all time)" value={bhd(totals.collected)} tone="good" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search client / office / contract…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
      </p>

      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Client</TableHead>
                <TableHead className="w-16">Office</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No invoices match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.inv.id}>
                    <TableCell className="max-w-[180px]">
                      <p className="truncate font-medium">
                        {r.client?.company || r.client?.name || "—"}
                      </p>
                      <p className="font-mono text-[0.65rem] text-muted-foreground">
                        {r.contract?.contractNo ?? "—"}
                        {r.isClosed && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[0.6rem] text-muted-foreground"
                          >
                            closed
                          </Badge>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.office}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(r.inv.periodStart)} → {fmtDate(r.inv.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {r.inv.amount.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                      {r.remaining > 0 ? r.remaining.toFixed(3) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={r.inv.status}
                        overdue={r.overdue}
                        remaining={r.remaining}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={r.remaining > 0 ? "default" : "outline"}
                        className="h-7"
                        onClick={() => setSelectedId(r.inv.id)}
                      >
                        {r.remaining > 0 ? "Collect" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selectedClient?.company || selectedClient?.name || "Invoice"}
              {selectedContract && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedContract.contractNo}
                  {selectedContract.officeNo
                    ? ` · Office ${selectedContract.officeNo}`
                    : ""}
                  {selectedContract.status === "closed" ? " · closed" : ""}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selected ? (
              <InvoiceRow
                invoice={selected}
                payments={payments.filter((p) => p.invoiceId === selected.id)}
                onMarkPaid={markInvoicePaid}
                onRecordPayment={recordPayment}
                getReceiptUrl={getReceiptUrl}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({
  status,
  overdue,
  remaining,
}: {
  status: Invoice["status"];
  overdue: boolean;
  remaining: number;
}) {
  if (status === "paid")
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      >
        Paid
      </Badge>
    );
  if (status === "void")
    return (
      <Badge variant="outline" className="text-muted-foreground line-through">
        Written off
      </Badge>
    );
  if (overdue)
    return (
      <Badge variant="outline" className="border-destructive/25 bg-destructive/10 text-destructive">
        Overdue
      </Badge>
    );
  if (status === "partial")
    return (
      <Badge
        variant="outline"
        className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      >
        {remaining.toFixed(3)} left
      </Badge>
    );
  return <Badge variant="outline">Unpaid</Badge>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warn" | "crit" | "good";
}) {
  const color =
    tone === "crit"
      ? "text-destructive"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-amber-600 dark:text-amber-400";
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}
