"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import { statusOf } from "@/lib/client-status";
import {
  buildEmailBody,
  buildEmailSubject,
  defaultMessageType,
  type MessageType,
} from "@/lib/communications";
import {
  getCommsCapabilitiesAction,
  sendClientEmailAction,
} from "@/actions/comms";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { openA4PrintWindow } from "@/lib/document-print";

function EmailForm({
  client,
  onOpenDocument,
  onClose,
}: {
  client: Client;
  onOpenDocument?: (type: "invoice" | "receipt") => void;
  onClose: () => void;
}) {
  const [messageType, setMessageType] = useState<MessageType>(() =>
    defaultMessageType(client, statusOf(client)),
  );
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendEnabled, setResendEnabled] = useState(false);

  useEffect(() => {
    if (!client.id) return;
    void getCommsCapabilitiesAction()
      .then((caps) => setResendEnabled(caps.resend))
      .catch(() => setResendEnabled(false));
  }, [client.id]);

  const subject = buildEmailSubject(client, messageType);
  const body =
    messageType === "custom" ? custom : buildEmailBody(client, messageType);

  async function handleSend() {
    if (!client.email) return;
    setBusy(true);
    try {
      const attachDoc =
        messageType === "invoice" || messageType === "receipt";

      if (attachDoc && onOpenDocument) {
        onOpenDocument(messageType === "receipt" ? "receipt" : "invoice");
      }

      const result = await sendClientEmailAction({
        clientId: client.id,
        clientName: client.name,
        to: client.email,
        subject,
        body,
        messageType,
      });

      if (result.via === "resend") {
        toast.success("Email sent via Resend");
        onClose();
      } else {
        window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        toast.info("Resend not configured — opened your email app");
        onClose();
      }

      if (attachDoc && !resendEnabled) {
        setTimeout(
          () =>
            openA4PrintWindow(
              client,
              messageType === "receipt" ? "receipt" : "invoice",
            ),
          600,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
        <DialogTitle className="font-heading">Email Message</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <strong>{client.name}</strong>
            {client.company ? ` — ${client.company}` : ""} | {client.email}
          </p>
          <Badge variant={resendEnabled ? "default" : "secondary"} className="text-[0.65rem]">
            {resendEnabled ? "Resend" : "Mail app fallback"}
          </Badge>
        </div>
        <div className="space-y-2">
          <Label>Message type</Label>
          <Select
            value={messageType}
            onValueChange={(v) => setMessageType(v as MessageType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="overdue">Overdue Notice</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {messageType === "custom" && (
          <Textarea
            placeholder="Custom message…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={4}
          />
        )}
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
          <p>
            <strong>Subject:</strong> {subject}
          </p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
            {body || "—"}
          </pre>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          className="bg-[#D44638] hover:bg-[#c0392b]"
          disabled={busy || !client.email}
          onClick={() => void handleSend()}
        >
          {resendEnabled ? "Send via Resend" : "Send via Email App"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EmailDialog({
  client,
  open,
  onOpenChange,
  onOpenDocument,
}: {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDocument?: (type: "invoice" | "receipt") => void;
}) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" layout="scroll">
        {open && (
          <EmailForm
            key={client.id}
            client={client}
            onOpenDocument={onOpenDocument}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
