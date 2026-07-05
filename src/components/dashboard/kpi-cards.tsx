"use client";

import { useMemo } from "react";
import { useClientStats, useOffices } from "@/providers/crm-provider";
import { contractOfficeStats, officeDetailsMap } from "@/lib/office-contracts";
import { bhd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  DoorOpen,
} from "lucide-react";

export function RevenueTicker() {
  const stats = useClientStats();

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Portfolio Value
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">
            {bhd(stats.portfolio)}
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <TickerStat label="Collected" value={bhd(stats.collected)} />
          <TickerStat label="Outstanding" value={bhd(stats.outstanding)} />
          <TickerStat label="Overdue Risk" value={bhd(stats.overdueAmount)} />
        </div>
      </CardContent>
    </Card>
  );
}

function TickerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function KpiCards() {
  const stats = useClientStats();
  const { floors, officeOverrides, contracts, officeDetails } = useOffices();
  const officeStats = useMemo(
    () =>
      contractOfficeStats(
        floors,
        officeOverrides,
        contracts,
        officeDetailsMap(officeDetails),
      ),
    [floors, officeOverrides, contracts, officeDetails],
  );

  const items = [
    { icon: Users, label: "Total Clients", value: stats.total },
    { icon: AlertTriangle, label: "Overdue", value: stats.overdue },
    { icon: Clock, label: "Pending", value: stats.pending },
    { icon: CheckCircle2, label: "Paid", value: stats.paid },
    { icon: Building2, label: "Rented Offices", value: officeStats.rented },
    { icon: DoorOpen, label: "Available", value: officeStats.free },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-border shadow-sm">
            <CardContent className="p-4">
              <Icon className="mb-2 size-4 text-muted-foreground" />
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
