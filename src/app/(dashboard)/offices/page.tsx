"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOffices } from "@/providers/crm-provider";
import { globalOfficeStats, resolveOfficeCompany, resolveOfficeStatus } from "@/lib/office-stats";
import { sortOfficeRows, type OfficeSortKey } from "@/lib/table-sort";
import { useTableSort } from "@/hooks/use-table-sort";
import type { Client } from "@/types/client";
import type { OfficeStatus } from "@/types/office";
import { PageHeader } from "@/components/layout/page-header";
import { OfficeEditDialog } from "@/components/offices/office-edit-dialog";
import { OfficeFloorPlan } from "@/components/offices/office-floor-plan";
import { FloorManagerDialog } from "@/components/offices/floor-manager-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { OfficeStatusIndicator } from "@/components/offices/office-status-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<
  OfficeStatus,
  { label: string; row: string }
> = {
  rented: {
    label: "Rented",
    row: "bg-muted/60 hover:bg-muted",
  },
  unrented: {
    label: "Free",
    row: "bg-background hover:bg-muted/40",
  },
  restricted: {
    label: "Restricted",
    row: "bg-destructive/5 hover:bg-destructive/10",
  },
};

type ResolvedOfficeRow = {
  key: string;
  no: string;
  status: OfficeStatus;
  company: string;
  linkedClient?: Client;
};

export default function OfficesPage() {
  const { clients, floors, officeOverrides, saveOfficeEdit } = useOffices();
  const floorKeys = useMemo(() => Object.keys(floors), [floors]);
  const [activeFloor, setActiveFloor] = useState(floorKeys[0] ?? "");
  const [editTarget, setEditTarget] = useState<{
    floorKey: string;
    officeNo: string;
    status: OfficeStatus;
    company: string;
    linkedClientName?: string;
  } | null>(null);
  const [floorMgrOpen, setFloorMgrOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"plan" | "table">("plan");
  const [statusFilter, setStatusFilter] = useState<OfficeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const { sortKey, direction, toggleSort } = useTableSort<OfficeSortKey>(
    "no",
    "asc",
  );

  const stats = useMemo(
    () => globalOfficeStats(floors, officeOverrides),
    [floors, officeOverrides],
  );

  const currentFloor = floors[activeFloor];

  const sectionsWithOffices = useMemo(() => {
    if (!currentFloor) return [];
    const q = search.toLowerCase().trim();

    return currentFloor.sections.map((sec, sIdx) => {
      let rows: ResolvedOfficeRow[] = sec.offices.map((o, oIdx) => {
        const st = resolveOfficeStatus(
          activeFloor,
          o.no,
          o.st,
          officeOverrides,
        );
        const { company, linkedClient } = resolveOfficeCompany(
          activeFloor,
          o.no,
          o.co,
          officeOverrides,
          clients,
        );
        return {
          key: `${activeFloor}-${sIdx}-${oIdx}`,
          no: o.no,
          status: st,
          company,
          linkedClient: linkedClient ?? undefined,
        };
      });

      if (statusFilter !== "all") {
        rows = rows.filter((r) => r.status === statusFilter);
      }

      if (q) {
        rows = rows.filter(
          (r) =>
            r.no.toLowerCase().includes(q) ||
            r.company.toLowerCase().includes(q) ||
            r.linkedClient?.name.toLowerCase().includes(q),
        );
      }

      rows = sortOfficeRows(rows, sortKey, direction);
      return { title: sec.title, sIdx, rows };
    });
  }, [
    activeFloor,
    clients,
    currentFloor,
    officeOverrides,
    search,
    sortKey,
    direction,
    statusFilter,
  ]);

  function openEdit(floorKey: string, officeNo: string) {
    const floor = floors[floorKey];
    if (!floor) return;
    let defaultStatus: OfficeStatus = "unrented";
    floor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        if (o.no === officeNo) defaultStatus = o.st;
      }),
    );
    const status = resolveOfficeStatus(
      floorKey,
      officeNo,
      defaultStatus,
      officeOverrides,
    );
    const { company, linkedClient } = resolveOfficeCompany(
      floorKey,
      officeNo,
      "",
      officeOverrides,
      clients,
    );
    setEditTarget({
      floorKey,
      officeNo,
      status,
      company,
      linkedClientName: linkedClient?.name,
    });
  }

  async function handleSaveEdit(input: {
    status: OfficeStatus;
    company: string;
  }) {
    if (!editTarget) return;
    try {
      await saveOfficeEdit({
        floorKey: editTarget.floorKey,
        officeNo: editTarget.officeNo,
        status: input.status,
        company: input.company,
      });
      toast.success("Office updated");
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Office Management"
          description="Pick an office from the floor plan — like choosing a seat"
        />
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "plan" | "table")}
          >
            <TabsList>
              <TabsTrigger value="plan">Floor Plan</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setFloorMgrOpen(true)}>
            Manage Floors & Sections
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">How it works:</strong> Green offices are
        available — click one to assign a company, just like picking a seat. Click
        any office to edit its status. When you add/edit a client with an office
        number, that office updates automatically.{" "}
        <Badge variant="secondary" className="ml-1 text-[0.65rem]">
          Linked
        </Badge>{" "}
        = connected to a live client record.
      </div>

      <div className="flex flex-wrap gap-2">
        {(["rented", "unrented", "restricted"] as OfficeStatus[]).map((st) => (
          <Badge
            key={st}
            variant="outline"
            className={statusStyles[st].row}
          >
            <span className="inline-flex items-center gap-1.5">
              <OfficeStatusIndicator status={st} />
              {statusStyles[st].label}
            </span>
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Rented", value: stats.rented, color: "text-foreground" },
          { label: "Free", value: stats.free, color: "text-muted-foreground" },
          {
            label: "Restricted",
            value: stats.restricted,
            color: "text-destructive",
          },
          { label: "Occupancy", value: `${stats.rate}%`, color: "text-foreground" },
        ].map((item) => (
          <Card key={item.label} className="border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-semibold tabular-nums ${item.color}`}>
                {item.value}
              </p>
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs
        value={activeFloor}
        onValueChange={setActiveFloor}
        className="w-full"
      >
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {floorKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {floors[key].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as OfficeStatus | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rented">Rented</TabsTrigger>
            <TabsTrigger value="unrented">Free</TabsTrigger>
            <TabsTrigger value="restricted">Restricted</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search office or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {viewMode === "plan" ? (
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <OfficeFloorPlan
              sections={sectionsWithOffices}
              selectedNo={
                editTarget?.floorKey === activeFloor
                  ? editTarget.officeNo
                  : undefined
              }
              onSelect={(officeNo) => openEdit(activeFloor, officeNo)}
            />
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {sectionsWithOffices.map(({ title, sIdx, rows }) => (
          <Card key={`${activeFloor}-${sIdx}`} className="shadow-sm">
            <div className="border-b bg-muted/30 px-4 py-2">
              <h3 className="text-sm font-bold">{title}</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableTableHead
                      label="No."
                      sortKey="no"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      className="w-16"
                    />
                    <SortableTableHead
                      label="Status"
                      sortKey="status"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                      className="w-24"
                    />
                    <SortableTableHead
                      label="Company"
                      sortKey="company"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={toggleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No offices match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const style = statusStyles[row.status];
                      return (
                        <TableRow
                          key={row.key}
                          className={`cursor-pointer ${style.row}`}
                          onClick={() => openEdit(activeFloor, row.no)}
                        >
                          <TableCell className="font-mono text-sm font-bold">
                            {row.no}
                          </TableCell>
                          <TableCell className="text-xs font-semibold whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <OfficeStatusIndicator status={row.status} />
                              {style.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.company ? (
                              <strong>{row.company}</strong>
                            ) : (
                              <span className="text-muted-foreground italic">
                                — empty —
                              </span>
                            )}
                            {row.linkedClient && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[0.6rem] text-muted-foreground"
                              >
                                linked
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}
      </div>
      )}

      <OfficeEditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        officeNo={editTarget?.officeNo ?? ""}
        status={editTarget?.status ?? "unrented"}
        company={editTarget?.company ?? ""}
        linkedClientName={editTarget?.linkedClientName}
        onSave={handleSaveEdit}
      />

      <FloorManagerDialog
        open={floorMgrOpen}
        onOpenChange={setFloorMgrOpen}
      />
    </div>
  );
}
