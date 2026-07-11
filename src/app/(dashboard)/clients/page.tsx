"use client";

import { useState } from "react";
import { toast } from "sonner";
import { refreshAllClientCrDataAction } from "@/actions/sijilat";
import { ClientTable } from "@/components/clients/client-table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { CrRefreshDialog } from "@/components/clients/cr-refresh-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useCrm } from "@/providers/crm-provider";
import { exportClientsCsv } from "@/lib/csv-export";

export default function ClientsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [crOpen, setCrOpen] = useState(false);
  const [updatingCr, setUpdatingCr] = useState(false);
  const { clients, refresh } = useCrm();

  async function handleUpdateAllCrs() {
    try {
      setUpdatingCr(true);
      const result = await refreshAllClientCrDataAction();
      await refresh();

      const message = `Updated ${result.updated} of ${result.checked} commercial CR record${
        result.checked === 1 ? "" : "s"
      }`;

      if (result.failed > 0) {
        toast.error(`${message}. ${result.failed} lookup failed.`);
      } else if (result.updated > 0) {
        toast.success(message);
      } else {
        toast.info("All CR expiry dates and statuses are already up to date.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CR update failed");
    } finally {
      setUpdatingCr(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="All Clients"
          description="Manage invoices, communications & records"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateAllCrs}
            disabled={updatingCr || clients.length === 0}
          >
            {updatingCr ? "Updating CRs…" : "Update CR expiry/status"}
          </Button>
          <Button variant="outline" onClick={() => setCrOpen(true)}>
            Import CR CSV
          </Button>
          <Button variant="outline" onClick={() => exportClientsCsv(clients)}>
            Export CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>+ Add Client</Button>
        </div>
      </div>
      <ClientTable />
      <ClientFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <CrRefreshDialog open={crOpen} onOpenChange={setCrOpen} />
    </div>
  );
}
