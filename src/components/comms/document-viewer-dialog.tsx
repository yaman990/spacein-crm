"use client";

import type { Client } from "@/types/client";
import type { DocumentType } from "@/lib/invoice-document";
import { openA4PrintWindow } from "@/lib/document-print";
import { sendClientEmailAction, sendClientWhatsAppAction } from "@/actions/comms";
import {
  buildEmailBody,
  buildEmailSubject,
  buildWaMessage,
} from "@/lib/communications";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceDocumentView } from "@/components/comms/invoice-document-view";
import { toast } from "sonner";
import { useState } from "react";

export function DocumentViewerDialog({
  client,
  type,
  open,
  onOpenChange,
}: {
  client: Client | null;
  type: DocumentType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!client) return null;

  function handlePrint() {
    openA4PrintWindow(client!, type);
  }

  async function handleWhatsApp() {
    if (!client?.phone) return;
    setBusy(true);
    try {
      const message = buildWaMessage(client, type);
      const result = await sendClientWhatsAppAction({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        message,
        messageType: type,
      });
      if (result.via === "cloud_api") {
        toast.success("WhatsApp sent via Business API");
      } else if (result.link) {
        window.open(result.link, "_blank");
        toast.info("WhatsApp API not configured — opened chat link");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WhatsApp send failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail() {
    if (!client?.email) return;
    setBusy(true);
    try {
      const subject = buildEmailSubject(client, type);
      const body = buildEmailBody(client, type);
      const result = await sendClientEmailAction({
        clientId: client.id,
        clientName: client.name,
        to: client.email,
        subject,
        body,
        messageType: type,
      });
      if (result.via === "resend") {
        toast.success("Email sent via Resend");
      } else {
        window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        toast.info("Resend not configured — opened your email app");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="document" layout="scroll" className="max-h-[min(95vh,900px)]">
        <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
          <DialogTitle className="font-heading">
            {type === "receipt" ? "Receipt" : "Invoice"} — {client.name}
          </DialogTitle>
          <DialogDescription>
            A4 preview — use Print / PDF to save as A4 document
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-3 py-3 sm:px-5">
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-2 sm:p-4">
            <div className="mx-auto w-fit origin-top scale-[0.42] sm:scale-[0.62] md:scale-[0.78] lg:scale-100">
              <InvoiceDocumentView client={client} type={type} />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="flex-wrap gap-2">
          <Button disabled={busy} onClick={handlePrint}>
            Print / Save PDF (A4)
          </Button>
          {client.phone && (
            <Button
              className="bg-[#25D366] hover:bg-[#20bd5a]"
              disabled={busy}
              onClick={() => void handleWhatsApp()}
            >
              WhatsApp
            </Button>
          )}
          {client.email && (
            <Button
              className="bg-[#D44638] hover:bg-[#c0392b]"
              disabled={busy}
              onClick={() => void handleEmail()}
            >
              Email
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
