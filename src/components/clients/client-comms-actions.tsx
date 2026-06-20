"use client";

import { useState } from "react";
import { FileText, Mail, MessageCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import { useCrm } from "@/providers/crm-provider";
import { statusOf } from "@/lib/client-status";
import { DocumentViewerDialog } from "@/components/comms/document-viewer-dialog";
import { WhatsAppDialog } from "@/components/comms/whatsapp-dialog";
import { EmailDialog } from "@/components/comms/email-dialog";
import { Button } from "@/components/ui/button";

export function ClientCommsActions({
  client,
  compact = false,
}: {
  client: Client;
  compact?: boolean;
}) {
  const { recordDocument } = useCrm();
  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState<"invoice" | "receipt">("invoice");
  const [waOpen, setWaOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = statusOf(client);

  async function openDocument(type: "invoice" | "receipt") {
    setBusy(true);
    try {
      await recordDocument(client.id, type);
      setDocType(type);
      setDocOpen(true);
      toast.success(
        type === "receipt" ? "Receipt generated" : "Invoice generated",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate document",
      );
    } finally {
      setBusy(false);
    }
  }

  const btnClass = compact ? "h-7 px-2" : "h-8 px-2.5";

  return (
    <>
      {client.phone && (
        <Button
          size="sm"
          variant="outline"
          className={`${btnClass} border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
          disabled={busy}
          aria-label={`WhatsApp ${client.name}`}
          onClick={() => setWaOpen(true)}
          title="WhatsApp"
        >
          <MessageCircle className="size-3.5" />
          <span className="sr-only">WhatsApp</span>
        </Button>
      )}
      {client.email && (
        <Button
          size="sm"
          variant="outline"
          className={`${btnClass} border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
          disabled={busy}
          aria-label={`Email ${client.name}`}
          onClick={() => setEmailOpen(true)}
          title="Email"
        >
          <Mail className="size-3.5" />
          <span className="sr-only">Email</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className={`${btnClass} border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
        disabled={busy}
        aria-label={`Invoice for ${client.name}`}
        onClick={() => void openDocument("invoice")}
        title="Invoice"
      >
        <FileText className="size-3.5" />
        <span className="sr-only">Invoice</span>
      </Button>
      {(status === "paid" || client.paidAt) && (
        <Button
          size="sm"
          variant="outline"
          className={`${btnClass} border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
          disabled={busy}
          aria-label={`Receipt for ${client.name}`}
          onClick={() => void openDocument("receipt")}
          title="Receipt"
        >
          <Receipt className="size-3.5" />
          <span className="sr-only">Receipt</span>
        </Button>
      )}

      <DocumentViewerDialog
        client={client}
        type={docType}
        open={docOpen}
        onOpenChange={setDocOpen}
      />
      <WhatsAppDialog
        client={client}
        open={waOpen}
        onOpenChange={setWaOpen}
        onOpenDocument={(type) => {
          setDocType(type);
          setDocOpen(true);
        }}
      />
      <EmailDialog
        client={client}
        open={emailOpen}
        onOpenChange={setEmailOpen}
        onOpenDocument={(type) => {
          setDocType(type);
          setDocOpen(true);
        }}
      />
    </>
  );
}
