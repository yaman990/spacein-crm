"use client";

import { Ban, Check } from "lucide-react";
import type { Client } from "@/types/client";
import type { OfficeStatus } from "@/types/office";
import { cn } from "@/lib/utils";

export type FloorPlanRow = {
  key: string;
  no: string;
  status: OfficeStatus;
  company: string;
  linkedClient?: Client;
};

export type FloorPlanSection = {
  title: string;
  sIdx: number;
  rows: FloorPlanRow[];
};

const seatStyles: Record<OfficeStatus, string> = {
  unrented:
    "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-500 dark:text-emerald-300",
  rented:
    "border-border bg-muted text-muted-foreground hover:bg-muted/70 hover:border-foreground/30",
  restricted:
    "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
};

function OfficeSeat({
  row,
  selected,
  onSelect,
}: {
  row: FloorPlanRow;
  selected: boolean;
  onSelect: (officeNo: string) => void;
}) {
  const title =
    row.status === "unrented"
      ? `Office ${row.no} — Available (click to assign)`
      : row.status === "restricted"
        ? `Office ${row.no} — Restricted`
        : `Office ${row.no} — ${row.company || "Rented"}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => onSelect(row.no)}
      className={cn(
        "group relative flex h-20 flex-col items-center justify-center gap-0.5 rounded-lg border p-1.5 text-center transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        seatStyles[row.status],
        selected && "ring-2 ring-offset-2 ring-foreground",
      )}
    >
      {row.status === "restricted" && (
        <Ban className="absolute right-1 top-1 size-3 opacity-70" aria-hidden />
      )}
      {selected && (
        <span className="absolute -left-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-2.5" aria-hidden />
        </span>
      )}
      <span className="font-mono text-base font-bold leading-none">
        {row.no}
      </span>
      {row.status === "unrented" ? (
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide">
          Available
        </span>
      ) : (
        <span className="line-clamp-2 w-full text-[0.6rem] font-medium leading-tight">
          {row.company || (row.status === "restricted" ? "Restricted" : "—")}
        </span>
      )}
    </button>
  );
}

export function OfficeFloorPlan({
  sections,
  selectedNo,
  onSelect,
}: {
  sections: FloorPlanSection[];
  selectedNo?: string;
  onSelect: (officeNo: string) => void;
}) {
  return (
    <div className="space-y-6">
      {sections.map((sec) => (
        <div key={sec.sIdx} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{sec.title}</h3>
            <span className="text-xs text-muted-foreground">
              {sec.rows.length} {sec.rows.length === 1 ? "office" : "offices"}
            </span>
          </div>
          {sec.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No offices match your filters
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
              {sec.rows.map((row) => (
                <OfficeSeat
                  key={row.key}
                  row={row}
                  selected={selectedNo === row.no}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
