"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/types/client";
import { useClients } from "@/providers/crm-provider";
import { daysUntilDue, statusOf } from "@/lib/client-status";
import { bhd, fmtDate } from "@/lib/format";
import {
  sortClientsByColumn,
  type ClientSortKey,
} from "@/lib/table-sort";
import { useTableSort } from "@/hooks/use-table-sort";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { RentedByTag } from "@/components/clients/rented-by-tag";
import { DueBadge } from "@/components/clients/due-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Filter = "all" | "overdue" | "pending" | "paid";

export function PriorityClientTable() {
  const { clients, isHydrated } = useClients();
  const [filter, setFilter] = useState<Filter>("all");
  const { sortKey, direction, toggleSort } = useTableSort<ClientSortKey>(
    "priority",
    "asc",
  );

  const sorted = useMemo(() => {
    let list = [...clients];
    if (filter === "overdue")
      list = list.filter((c) => statusOf(c) === "overdue");
    else if (filter === "pending")
      list = list.filter((c) =>
        ["pending", "sent"].includes(statusOf(c)),
      );
    else if (filter === "paid")
      list = list.filter((c) => statusOf(c) === "paid");

    return sortClientsByColumn(list, sortKey, direction).slice(0, 50);
  }, [clients, filter, sortKey, direction]);

  if (!isHydrated) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">
          Priority Client View
        </CardTitle>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                  label="Due Date"
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
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No clients match your filters
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((client) => (
                  <PriorityRow key={client.id} client={client} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityRow({ client }: { client: Client }) {
  const status = statusOf(client);
  const days = daysUntilDue(client);

  return (
    <TableRow>
      <TableCell>
        <p className="max-w-[200px] truncate font-semibold">{client.name}</p>
        {client.company && (
          <p className="truncate text-xs text-muted-foreground">
            {client.company}
          </p>
        )}
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
        {days !== null && status !== "paid" && <DueBadge days={days} />}
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
