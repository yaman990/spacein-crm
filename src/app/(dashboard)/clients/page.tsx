"use client";

import { useState } from "react";
import { ClientTable } from "@/components/clients/client-table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { CrRefreshDialog } from "@/components/clients/cr-refresh-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useClients } from "@/providers/crm-provider";
import { exportClientsCsv } from "@/lib/csv-export";

export default function ClientsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [crOpen, setCrOpen] = useState(false);
  const { clients } = useClients();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="All Clients"
          description="Manage invoices, communications & records"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCrOpen(true)}>
            Refresh CR data
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
