"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useOffices } from "@/providers/crm-provider";
import {
  resolveOfficeCompany,
  resolveOfficeStatus,
  officeCategoryFromTitle,
  OFFICE_CATEGORY_LABELS,
  type OfficeCategory,
} from "@/lib/office-stats";
import {
  contractOfficeStats,
  deriveOccupancy,
  officeDetailsMap,
  type DerivedOfficeStatus,
  type OfficeOccupancy,
} from "@/lib/office-contracts";
import { sortOfficeRows, type OfficeSortKey } from "@/lib/table-sort";
import { useTableSort } from "@/hooks/use-table-sort";
import type { Client } from "@/types/client";
import type { OfficeStatus } from "@/types/office";
import { PageHeader } from "@/components/layout/page-header";
import { OfficeEditDialog } from "@/components/offices/office-edit-dialog";
import { OfficeFloorPlan } from "@/components/offices/office-floor-plan";
import {
  OfficeFloorMap,
  type OfficeInfo,
} from "@/components/offices/office-floor-map";
import { NewContractDialog } from "@/components/contracts/new-contract-dialog";
import { ContractDetailDialog } from "@/components/contracts/contract-detail-dialog";
import {
  EditContractDialog,
  type OfficeOption,
} from "@/components/contracts/edit-contract-dialog";
import type { Contract } from "@/types/contract";
import { OfficeSetupDialog } from "@/components/offices/office-setup-dialog";
import { FLOOR5_LAYOUT } from "@/data/floor5-layout";
import { FloorManagerDialog } from "@/components/offices/floor-manager-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
};

/** Map the richer contract-derived status onto the 3-state used by the table. */
function simplifyStatus(s: DerivedOfficeStatus): OfficeStatus {
  if (s === "restricted") return "restricted";
  if (s === "available") return "unrented";
  return "rented"; // reserved / active / shared / full / renewal / expired / legacy
}

const LEGEND: { label: string; cls: string }[] = [
  { label: "Available", cls: "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { label: "Reserved (unpaid)", cls: "border-amber-500/60 bg-amber-400/20 text-amber-700 dark:text-amber-300" },
  { label: "Rented", cls: "border-border bg-muted text-muted-foreground" },
  { label: "Shared n/N", cls: "border-teal-500/60 bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  { label: "Renewal await payment", cls: "border-orange-500/60 bg-orange-400/20 text-orange-700 dark:text-orange-300" },
  { label: "Expired", cls: "border-destructive/60 bg-destructive/20 text-destructive" },
  { label: "No contract yet", cls: "border-dashed border-amber-500/70 bg-muted text-muted-foreground" },
  { label: "Restricted", cls: "border-destructive/50 bg-destructive/15 text-destructive" },
];

export default function OfficesPage() {
  const {
    clients,
    floors,
    officeOverrides,
    contracts,
    invoices,
    officeDetails,
    building,
    saveOfficeEdit,
    createContract,
    saveOfficeDetails,
    saveBuilding,
    markInvoicePaid,
    getReceiptUrl,
    renewContract,
    closeContract,
    updateContract,
    runContractChecks,
  } = useOffices();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [runningChecks, setRunningChecks] = useState(false);

  async function handleRunChecks() {
    setRunningChecks(true);
    try {
      const s = await runContractChecks();
      toast.success(
        `Checks done — renewed ${s.renewed}, expired ${s.expired}, reminded ${s.reminded}` +
          (s.emailsSent ? `, ${s.emailsSent} emails sent` : "") +
          (s.emailErrors ? `, ${s.emailErrors} email errors` : ""),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunningChecks(false);
    }
  }

  const floorKeys = useMemo(() => Object.keys(floors), [floors]);
  const [activeFloor, setActiveFloor] = useState(floorKeys[0] ?? "");
  const [newContractTarget, setNewContractTarget] = useState<{
    floorKey: string;
    officeNo: string;
  } | null>(null);
  const [detailOfficeNo, setDetailOfficeNo] = useState<string | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
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
  const [categoryFilter, setCategoryFilter] = useState<OfficeCategory | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const { sortKey, direction, toggleSort } = useTableSort<OfficeSortKey>(
    "no",
    "asc",
  );

  const currentFloor = floors[activeFloor];

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const detailsByKey = useMemo(
    () => officeDetailsMap(officeDetails),
    [officeDetails],
  );

  const occupantLabel = useCallback(
    (occ: OfficeOccupancy): string =>
      occ.contracts
        .map((c) => {
          const cl = clientById.get(c.clientId);
          return cl?.company || cl?.name || "";
        })
        .filter(Boolean)
        .join(", "),
    [clientById],
  );

  // occupancy for every office on the active floor (contract-derived, with
  // the legacy floor data as fallback so pre-contract tenants stay visible)
  const occupancyByNo = useMemo(() => {
    const m = new Map<string, OfficeOccupancy>();
    if (!currentFloor) return m;
    currentFloor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        if (!o.no || o.no === "—") return;
        const legacyStatus = resolveOfficeStatus(
          activeFloor,
          o.no,
          o.st,
          officeOverrides,
        );
        const { company: legacyCompany } = resolveOfficeCompany(
          activeFloor,
          o.no,
          o.co,
          officeOverrides,
          clients,
        );
        m.set(
          o.no,
          deriveOccupancy(
            activeFloor,
            o.no,
            contracts,
            detailsByKey,
            legacyStatus,
            legacyCompany,
          ),
        );
      }),
    );
    return m;
  }, [currentFloor, activeFloor, contracts, detailsByKey, officeOverrides, clients]);

  // global stats across all floors — same source as Dashboard & Analytics
  const stats = useMemo(
    () => contractOfficeStats(floors, officeOverrides, contracts, detailsByKey),
    [floors, contracts, detailsByKey, officeOverrides],
  );

  const sectionsWithOffices = useMemo(() => {
    if (!currentFloor) return [];
    const q = search.toLowerCase().trim();

    return currentFloor.sections
      .map((sec, sIdx) => ({ sec, sIdx }))
      .filter(
        ({ sec }) =>
          categoryFilter === "all" ||
          officeCategoryFromTitle(sec.title) === categoryFilter,
      )
      .map(({ sec, sIdx }) => {
      let rows: ResolvedOfficeRow[] = sec.offices.map((o, oIdx) => {
        const occ = occupancyByNo.get(o.no);
        const status = occ ? simplifyStatus(occ.status) : "unrented";
        const company = occ
          ? occupantLabel(occ) || occ.legacyOccupant || ""
          : "";
        return {
          key: `${activeFloor}-${sIdx}-${oIdx}`,
          no: o.no,
          status,
          company,
        };
      });

      if (statusFilter !== "all") {
        rows = rows.filter((r) => r.status === statusFilter);
      }

      if (q) {
        rows = rows.filter(
          (r) =>
            r.no.toLowerCase().includes(q) ||
            r.company.toLowerCase().includes(q),
        );
      }

      rows = sortOfficeRows(rows, sortKey, direction);
      return { title: sec.title, sIdx, rows };
    });
  }, [
    activeFloor,
    currentFloor,
    occupancyByNo,
    occupantLabel,
    search,
    sortKey,
    direction,
    statusFilter,
    categoryFilter,
  ]);

  const hasFloorPlan = activeFloor === "floor5";

  // Contract-derived status + occupant for every office on the floor — used to
  // colour the CAD floor map.
  const officeInfo = useMemo(() => {
    const map = new Map<string, OfficeInfo>();
    occupancyByNo.forEach((occ, no) => {
      map.set(no, {
        status: occ.status,
        label: occupantLabel(occ) || occ.legacyOccupant || "",
        used: occ.used,
        capacity: occ.capacity,
      });
    });
    return map;
  }, [occupancyByNo, occupantLabel]);

  // Offices a contract can be corrected to: any office with a free slot on
  // any floor, plus the contract's current office.
  const officeOptions = useMemo<OfficeOption[]>(() => {
    const out: OfficeOption[] = [];
    Object.entries(floors).forEach(([fk, floor]) =>
      floor.sections.forEach((sec) =>
        sec.offices.forEach((o) => {
          if (!o.no || o.no === "—") return;
          const legacyStatus = resolveOfficeStatus(fk, o.no, o.st, officeOverrides);
          const occ = deriveOccupancy(fk, o.no, contracts, detailsByKey, legacyStatus);
          const isCurrent =
            editContract?.floorKey === fk && editContract?.officeNo === o.no;
          if (occ.hasFreeSlot || isCurrent) {
            out.push({
              floorKey: fk,
              officeNo: o.no,
              label: `${o.no} — ${floor.label}${isCurrent ? " (current)" : ""}`,
            });
          }
        }),
      ),
    );
    return out.sort((a, b) => Number(a.officeNo) - Number(b.officeNo));
  }, [floors, officeOverrides, contracts, detailsByKey, editContract]);

  // Office numbers passing the active filters — highlighted on the map.
  const matchedNos = useMemo(() => {
    const set = new Set<string>();
    sectionsWithOffices.forEach((sec) =>
      sec.rows.forEach((r) => set.add(r.no)),
    );
    return set;
  }, [sectionsWithOffices]);

  const filtersActive =
    statusFilter !== "all" || categoryFilter !== "all" || search.trim() !== "";

  function openEdit(floorKey: string, officeNo: string) {
    const floor = floors[floorKey];
    if (!floor) return;
    let defaultStatus: OfficeStatus = "unrented";
    floor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        if (o.no === officeNo) defaultStatus = o.st;
      }),
    );
    const occ = occupancyByNo.get(officeNo);
    const status = occ
      ? simplifyStatus(occ.status)
      : resolveOfficeStatus(floorKey, officeNo, defaultStatus, officeOverrides);
    const company = occ ? occupantLabel(occ) : "";
    setEditTarget({
      floorKey,
      officeNo,
      status,
      company,
      linkedClientName: company || undefined,
    });
  }

  /**
   * Click an office: restricted → edit; empty → new contract; occupied → the
   * contract detail (mark paid, view receipt, add tenant if a slot is free).
   */
  function selectOffice(officeNo: string) {
    const occ = occupancyByNo.get(officeNo);
    if (!occ) return;
    if (occ.status === "restricted") openEdit(activeFloor, officeNo);
    else if (occ.used === 0) setNewContractTarget({ floorKey: activeFloor, officeNo });
    else setDetailOfficeNo(officeNo);
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
          {isAdmin && (
            <Button
              variant="outline"
              disabled={runningChecks}
              onClick={handleRunChecks}
              title="Auto-renew/expire ended contracts and email 30-day expiry reminders"
            >
              {runningChecks ? "Running…" : "Run renewals & reminders"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setSetupOpen(true)}>
            Building & Rates
          </Button>
          <Button onClick={() => setFloorMgrOpen(true)}>
            Manage Floors & Sections
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">How it works:</strong> Click a{" "}
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
          green
        </span>{" "}
        office to open a <strong>new contract</strong> (client, period, rate,
        discount — an invoice is issued and the office becomes Reserved). Click
        an <strong>occupied</strong> office to manage its contracts: upload the
        payment receipt to activate, renew, close (frees the office) or print
        the lease contract. Offices with an{" "}
        <span className="font-semibold">amber dashed border</span> have a
        recorded tenant but <strong>no contract yet</strong> — click to create
        it.
      </div>

      <div className="flex flex-wrap gap-2">
        {LEGEND.map((item) => (
          <Badge key={item.label} variant="outline" className={item.cls}>
            {item.label}
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as OfficeCategory | "all")}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(OFFICE_CATEGORY_LABELS) as OfficeCategory[]).map(
                (cat) => (
                  <SelectItem key={cat} value={cat}>
                    {OFFICE_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
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
            {hasFloorPlan ? (
              <OfficeFloorMap
                layout={FLOOR5_LAYOUT}
                officeInfo={officeInfo}
                matchedNos={matchedNos}
                filtersActive={filtersActive}
                selectedNo={
                  editTarget?.floorKey === activeFloor
                    ? editTarget.officeNo
                    : undefined
                }
                onSelect={selectOffice}
              />
            ) : (
              <OfficeFloorPlan
                sections={sectionsWithOffices}
                selectedNo={
                  editTarget?.floorKey === activeFloor
                    ? editTarget.officeNo
                    : undefined
                }
                onSelect={selectOffice}
              />
            )}
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
                          onClick={() => selectOffice(row.no)}
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

      {newContractTarget && (
        <NewContractDialog
          open={!!newContractTarget}
          onOpenChange={(open) => !open && setNewContractTarget(null)}
          floorKey={newContractTarget.floorKey}
          officeNo={newContractTarget.officeNo}
          details={detailsByKey.get(
            `${newContractTarget.floorKey}_${newContractTarget.officeNo}`,
          )}
          building={building}
          clients={clients}
          legacyOccupant={
            occupancyByNo.get(newContractTarget.officeNo)?.status === "legacy"
              ? (occupancyByNo.get(newContractTarget.officeNo)?.legacyOccupant ??
                "")
              : undefined
          }
          onMarkFree={async () => {
            try {
              await saveOfficeEdit({
                floorKey: newContractTarget.floorKey,
                officeNo: newContractTarget.officeNo,
                status: "unrented",
                company: "",
              });
              toast.success("Office marked free");
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Failed to mark free",
              );
            }
          }}
          onCreate={async (input) => {
            try {
              await createContract(input);
              toast.success(`Contract created for office ${input.officeNo}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Create failed");
              throw err;
            }
          }}
        />
      )}

      <ContractDetailDialog
        open={!!detailOfficeNo}
        onOpenChange={(open) => !open && setDetailOfficeNo(null)}
        occupancy={detailOfficeNo ? occupancyByNo.get(detailOfficeNo) ?? null : null}
        invoices={invoices}
        clients={clients}
        building={building}
        hasFreeSlot={
          detailOfficeNo
            ? (occupancyByNo.get(detailOfficeNo)?.hasFreeSlot ?? false)
            : false
        }
        onMarkPaid={markInvoicePaid}
        getReceiptUrl={getReceiptUrl}
        onRenew={renewContract}
        onClose={closeContract}
        onEdit={(c) => {
          setEditContract(c);
          setDetailOfficeNo(null);
        }}
        onAddContract={() => {
          if (detailOfficeNo) {
            setNewContractTarget({ floorKey: activeFloor, officeNo: detailOfficeNo });
            setDetailOfficeNo(null);
          }
        }}
      />

      {editContract && (
        <EditContractDialog
          key={editContract.id}
          open={!!editContract}
          onOpenChange={(open) => !open && setEditContract(null)}
          contract={editContract}
          clients={clients}
          officeOptions={officeOptions}
          canEditFinancials={invoices.some(
            (i) => i.contractId === editContract.id && i.status === "issued",
          )}
          onSave={updateContract}
        />
      )}

      <OfficeSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        floors={floors}
        building={building}
        officeDetails={officeDetails}
        onSaveBuilding={saveBuilding}
        onSaveOfficeDetails={saveOfficeDetails}
      />
    </div>
  );
}
