"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useMemo, useState } from "react";
import { useActivityLog } from "@/providers/crm-provider";
import { bhd, fmtDateTime } from "@/lib/format";
import { sortActivityLog, type ActivitySortKey } from "@/lib/table-sort";
import { useTableSort } from "@/hooks/use-table-sort";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityType } from "@/types/activity";
import { ActivityTypeIcon } from "@/components/activity/activity-type-icon";

export default function HistoryPage() {
  const { activityLog, isHydrated } = useActivityLog();
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const { sortKey, direction, setSortKey, setDirection } =
    useTableSort<ActivitySortKey>("date", "desc");

  const logs = useMemo(() => {
    const list =
      filter === "all"
        ? activityLog
        : activityLog.filter((a) => a.type === filter);
    return sortActivityLog(list, sortKey, direction);
  }, [activityLog, filter, sortKey, direction]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="All system events & communications"
      />

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Activity</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as ActivityType | "all")}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="paid">Payments</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="wa">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="created">Created</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortKey}-${direction}`}
              onValueChange={(v) => {
                if (!v) return;
                const [key, dir] = v.split("-") as [
                  ActivitySortKey,
                  "asc" | "desc",
                ];
                setSortKey(key);
                setDirection(dir);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="amount-desc">Highest amount</SelectItem>
                <SelectItem value="amount-asc">Lowest amount</SelectItem>
                <SelectItem value="type-asc">Type A–Z</SelectItem>
                <SelectItem value="type-desc">Type Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="max-h-[65vh] overflow-y-auto p-4">
          {!isHydrated ? (
            <Skeleton className="h-40 w-full" />
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No activity yet. Actions will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="flex items-start gap-2 text-sm font-medium">
                      <ActivityTypeIcon type={entry.type} className="mt-0.5" />
                      <span>{entry.desc}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(entry.ts)}
                    </p>
                  </div>
                  {entry.amt != null && (
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {bhd(entry.amt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
