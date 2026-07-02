"use client";

import { Ban, Check } from "lucide-react";
import type { DerivedOfficeStatus } from "@/lib/office-contracts";
import type { FloorLayout, LandmarkKind } from "@/data/floor5-layout";
import { cn } from "@/lib/utils";

export type OfficeInfo = {
  status: DerivedOfficeStatus;
  label: string; // occupant / company, or ""
  used?: number;
  capacity?: number;
};

const seatStyles: Record<DerivedOfficeStatus, string> = {
  available:
    "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/30 hover:border-emerald-500 dark:text-emerald-300",
  shared:
    "border-teal-500/60 bg-teal-500/15 text-teal-700 hover:bg-teal-500/25 dark:text-teal-300",
  reserved:
    "border-amber-500/60 bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:text-amber-300",
  active:
    "border-border bg-muted text-muted-foreground hover:bg-muted/70 hover:border-foreground/40",
  full: "border-border bg-muted text-muted-foreground hover:bg-muted/70",
  renewal:
    "border-orange-500/60 bg-orange-400/20 text-orange-700 hover:bg-orange-400/30 dark:text-orange-300",
  expired:
    "border-destructive/60 bg-destructive/20 text-destructive hover:bg-destructive/30",
  restricted:
    "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25",
};

const STATUS_TITLE: Record<DerivedOfficeStatus, string> = {
  available: "Available (click to open a contract)",
  shared: "Shared — free slot (click to add a contract)",
  reserved: "Reserved — pending payment",
  active: "Rented",
  full: "Full",
  renewal: "Renewal — awaiting payment",
  expired: "Expired — awaiting close",
  restricted: "Restricted",
};

const landmarkStyles: Record<LandmarkKind, string> = {
  reception: "border-sky-400/50 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  room: "border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  vertical:
    "border-border bg-foreground/5 text-muted-foreground [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.04)_4px,rgba(0,0,0,0.04)_8px)]",
  service:
    "border-border bg-foreground/5 text-muted-foreground",
};

export function OfficeFloorMap({
  layout,
  officeInfo,
  matchedNos,
  filtersActive,
  selectedNo,
  onSelect,
}: {
  layout: FloorLayout;
  officeInfo: Map<string, OfficeInfo>;
  matchedNos: Set<string>;
  filtersActive: boolean;
  selectedNo?: string;
  onSelect: (officeNo: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto rounded-lg border border-dashed border-border bg-muted/10"
        style={{ width: layout.width, height: layout.height }}
      >
        {/* corridors */}
        {layout.corridor.map((c, i) => (
          <div
            key={`corridor-${i}`}
            className="absolute rounded-sm bg-sky-100/70 dark:bg-sky-950/40"
            style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
          />
        ))}

        {/* landmarks */}
        {layout.landmarks.map((lm) => (
          <div
            key={lm.label}
            className={cn(
              "absolute flex items-center justify-center rounded-md border text-center text-[0.65rem] font-semibold",
              landmarkStyles[lm.kind],
            )}
            style={{ left: lm.x, top: lm.y, width: lm.w, height: lm.h }}
          >
            {lm.label}
          </div>
        ))}

        {/* offices */}
        {layout.offices.map((o) => {
          const info = officeInfo.get(o.no);
          const status: DerivedOfficeStatus = info?.status ?? "available";
          const dimmed = filtersActive && !matchedNos.has(o.no);
          const selected = selectedNo === o.no;
          const shared = (info?.capacity ?? 1) > 1;
          const title = `Office ${o.no} — ${STATUS_TITLE[status]}${
            info?.label ? ` · ${info.label}` : ""
          }`;

          return (
            <button
              key={o.no}
              type="button"
              title={title}
              aria-label={title}
              onClick={() => onSelect(o.no)}
              className={cn(
                "group absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border p-0.5 text-center transition-all",
                "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                seatStyles[status],
                dimmed && "opacity-25 hover:opacity-60",
                selected && "z-10 ring-2 ring-offset-1 ring-foreground",
              )}
              style={{ left: o.x, top: o.y, width: o.w, height: o.h }}
            >
              {status === "restricted" && (
                <Ban
                  className="absolute right-0.5 top-0.5 size-2.5 opacity-70"
                  aria-hidden
                />
              )}
              {shared && (
                <span className="absolute right-0.5 top-0.5 rounded bg-foreground/70 px-0.5 text-[0.5rem] font-bold leading-tight text-background">
                  {info?.used ?? 0}/{info?.capacity}
                </span>
              )}
              {selected && (
                <span className="absolute -left-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-2" aria-hidden />
                </span>
              )}
              <span className="font-mono text-xs font-bold leading-none">
                {o.no}
              </span>
              {info?.label && status !== "available" && (
                <span className="line-clamp-2 w-full px-0.5 text-[0.5rem] leading-tight">
                  {info.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
