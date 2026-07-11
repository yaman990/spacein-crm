"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/types/client";
import { useClients, useContracts } from "@/providers/crm-provider";
import { daysUntilDue, statusOf } from "@/lib/client-status";
import {
  arrangeClients,
  buildLeaseIndex,
  type ArrangeFilter,
} from "@/lib/client-arrange";
import { bhd, fmtDate } from "@/lib/format";
import {
  sortClientsByColumn,
  type ClientSortKey,
} from "@/lib/table-sort";
import { useTableSort } from "@/hooks/use-table-sort";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ArrangeFilterSelect } from "@/components/clients/arrange-filter";
import { RentedByTag } from "@/components/clients/rented-by-tag";
import { DueBadge } from "@/components/clients/due-badge";
import { Input } from "@/components/ui/input";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function ClientTable() {
  const { clients, isHydrated } = useClients();
  const { contracts } = useContracts();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArrangeFilter>("all");
  const { sortKey, direction, toggleSort } = useTableSort<ClientSortKey>(
    "priority",
    "asc",
  );

  const leaseIndex = useMemo(() => buildLeaseIndex(contracts), [contracts]);
  const filtered = useMemo(() => {
    let list = arrangeClients(clients, filter, leaseIndex);

    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.rank.toLowerCase().includes(q) ||
          c.office.includes(q) ||
          c.rentedBy.toLowerCase().includes(q),
      );
    }
    return sortClientsByColumn(list, sortKey, direction);
  }, [clients, filter, leaseIndex, search, sortKey, direction]);

  if (!isHydrated) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ArrangeFilterSelect value={filter} onChange={setFilter} />
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} client{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableTableHead
                label="Client"
                sortKey="name"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Company"
                sortKey="company"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Office"
                sortKey="office"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Rented By"
                sortKey="rentedBy"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Amount"
                sortKey="amount"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Due"
                sortKey="dueDate"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                direction={direction}
                onSort={toggleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No clients match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  const status = statusOf(client);
  const days = daysUntilDue(client);

  return (
    <TableRow>
      <TableCell>
        <p className="max-w-[180px] truncate font-semibold">{client.name}</p>
        {client.rank && client.rank !== "-" && (
          <p className="font-mono text-[0.65rem] text-muted-foreground">
            {client.rank}
          </p>
        )}
      </TableCell>
      <TableCell className="max-w-[160px] truncate text-sm">
        {client.company || "—"}
      </TableCell>
      <TableCell>
        {client.office ? (
          <Badge variant="secondary" className="font-mono text-[0.68rem]">
            #{client.office}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <RentedByTag rentedBy={client.rentedBy} />
      </TableCell>
      <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">
        {bhd(client.amount)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <span className="font-mono text-xs">{fmtDate(client.dueDate)}</span>
        {days !== null && status !== "paid" && (
          <DueBadge days={days} />
        )}
      </TableCell>
      <TableCell>
        <ClientStatusBadge status={status} />
      </TableCell>
      <TableCell className="text-right">
        <ClientRowActions client={client} />
      </TableCell>
    </TableRow>
  );
}
