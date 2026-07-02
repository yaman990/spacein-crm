"use client";

import { useMemo, useState } from "react";
import { useContracts } from "@/providers/crm-provider";
import { daysUntil } from "@/lib/contract-checks";
import type { ContractStatus } from "@/types/contract";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<ContractStatus, string> = {
  reserved: "Reserved",
  active: "Active",
  renewal_await_payment: "Renewal – awaiting payment",
  expired: "Expired",
  closed: "Closed",
};

type Filter = "all" | "soon30" | "soon60" | "await" | "expired";

export function LeaseReport() {
  const { contracts, invoices, clients } = useContracts();
  const today = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState<Filter>("soon30");
  const [q, setQ] = useState("");

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const outstandingByContract = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((i) => {
      if (i.status !== "paid")
        m.set(i.contractId, (m.get(i.contractId) ?? 0) + i.amount);
    });
    return m;
  }, [invoices]);

  const rows = useMemo(() => {
    const open = contracts.filter((c) => c.status !== "closed");
    return open
      .map((c) => ({
        c,
        days: c.endDate ? daysUntil(c.endDate, today) : Infinity,
        client: clientById.get(c.clientId),
        outstanding: outstandingByContract.get(c.id) ?? 0,
      }))
      .sort((a, b) => a.days - b.days);
  }, [contracts, clientById, outstandingByContract, today]);

  const multiClientCount = useMemo(() => {
    const counts = new Map<string, number>();
    contracts
      .filter((c) => c.status !== "closed")
      .forEach((c) => counts.set(c.clientId, (counts.get(c.clientId) ?? 0) + 1));
    return [...counts.values()].filter((n) => n > 1).length;
  }, [contracts]);

  const stats = useMemo(() => {
    let active = 0,
      soon = 0,
      awaiting = 0,
      expired = 0;
    rows.forEach(({ c, days }) => {
      if (c.status === "active") active++;
      if (c.status === "renewal_await_payment" || c.status === "reserved")
        awaiting++;
      if (c.status === "expired") expired++;
      if (c.status === "active" && days <= 30 && days >= 0) soon++;
    });
    return { active, soon, awaiting, expired };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return rows.filter(({ c, days, client }) => {
      if (filter === "soon30" && !(c.status === "active" && days <= 30))
        return false;
      if (filter === "soon60" && !(c.status === "active" && days <= 60))
        return false;
      if (
        filter === "await" &&
        c.status !== "renewal_await_payment" &&
        c.status !== "reserved"
      )
        return false;
      if (filter === "expired" && c.status !== "expired") return false;
      if (query) {
        const hay =
          `${c.contractNo} ${c.officeNo ?? ""} ${client?.company ?? ""} ${client?.name ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, filter, q]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Active leases", value: stats.active },
          { label: "Expiring ≤30d", value: stats.soon },
          { label: "Awaiting payment", value: stats.awaiting },
          { label: "Expired", value: stats.expired },
          { label: "Clients w/ 2+", value: multiClientCount },
        ].map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="soon30">Expiring 30d</TabsTrigger>
            <TabsTrigger value="soon60">Expiring 60d</TabsTrigger>
            <TabsTrigger value="await">Awaiting payment</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search client / office / contract…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Contract</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="w-16">Office</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-20 text-right">Days left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No contracts match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(({ c, days, client, outstanding }) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {c.contractNo}
                    </TableCell>
                    <TableCell className="text-sm">
                      {client?.company || client?.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.officeNo ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.startDate} → {c.endDate}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm tabular-nums ${
                        Number.isFinite(days) && days <= 30
                          ? "font-semibold text-destructive"
                          : ""
                      }`}
                    >
                      {Number.isFinite(days) ? days : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{STATUS_LABEL[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {outstanding > 0 ? `${outstanding.toFixed(3)} BHD` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
