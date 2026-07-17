"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, CheckCircle2, Receipt } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import { useClients } from "@/providers/crm-provider";
import { statusOf } from "@/lib/client-status";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientCommsActions } from "@/components/clients/client-comms-actions";
import { Button } from "@/components/ui/button";

export function ClientRowActions({ client }: { client: Client }) {
  const { deleteClient, markPaid } = useClients();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = statusOf(client);

  async function handleMarkPaid() {
    setBusy(true);
    try {
      await markPaid(client.id);
      toast.success("Marked as paid");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark paid");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${client.name}?`)) return;
    setBusy(true);
    try {
      await deleteClient(client.id);
      toast.success("Client deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        <ClientCommsActions client={client} compact />
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={busy}
          aria-label={`Invoices for ${client.name}`}
          onClick={() => router.push(`/invoices?client=${client.id}`)}
        >
          <Receipt className="size-3.5" />
          <span className="sr-only">View invoices</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={busy}
          aria-label={`Edit ${client.name}`}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
        {status !== "paid" && (
          <Button
            size="sm"
            className="h-7 px-2"
            disabled={busy}
            aria-label={`Mark ${client.name} as paid`}
            onClick={() => void handleMarkPaid()}
          >
            <CheckCircle2 className="size-3.5" />
            <span className="sr-only">Mark paid</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-destructive hover:text-destructive"
          disabled={busy}
          aria-label={`Delete ${client.name}`}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />
    </>
  );
}
