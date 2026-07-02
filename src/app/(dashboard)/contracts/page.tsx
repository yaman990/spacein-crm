"use client";

import { useMemo } from "react";
import { useClients } from "@/providers/crm-provider";
import { crContractStats } from "@/lib/contracts";
import { exportCrCsv } from "@/lib/csv-export";
import { PageHeader } from "@/components/layout/page-header";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { LeaseReport } from "@/components/contracts/lease-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ContractsPage() {
  const { clients } = useClients();
  const stats = useMemo(() => crContractStats(clients), [clients]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="CR & Contracts"
          description="Commercial registration expiry, start dates & renewal tracking"
        />
        <Button variant="outline" onClick={() => exportCrCsv(clients)}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "With CR No.", value: stats.crTotal },
          { label: "CR Expired", value: stats.crExpired },
          { label: "Expiring 60d", value: stats.crSoon },
          { label: "Overdue Contracts", value: stats.contractOverdue },
          { label: "Due in 30d", value: stats.contractSoon },
          { label: "All Good", value: stats.contractOk },
        ].map((item) => (
          <Card key={item.label} className="border-border shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Lease contracts &amp; renewals
        </h2>
        <p className="text-sm text-muted-foreground">
          Office contracts by expiry — search a client to see all their leases.
        </p>
        <LeaseReport />
      </div>

      <ContractsTable />
    </div>
  );
}
