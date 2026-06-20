"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import { statusOf } from "@/lib/client-status";
import {
  buildWaMessage,
  defaultMessageType,
  type MessageType,
} from "@/lib/communications";
import {
  getCommsCapabilitiesAction,
  sendClientWhatsAppAction,
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

function WhatsAppForm({
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
  const [whatsappApiEnabled, setWhatsappApiEnabled] = useState(false);

  useEffect(() => {
    if (!client.id) return;
    void getCommsCapabilitiesAction()
      .then((caps) => setWhatsappApiEnabled(caps.whatsappApi))
      .catch(() => setWhatsappApiEnabled(false));
  }, [client.id]);

  const preview =
    messageType === "custom"
      ? custom || "Type your message above…"
      : buildWaMessage(client, messageType);

  async function handleSend() {
    if (!client.phone) return;
    setBusy(true);
    try {
      const result = await sendClientWhatsAppAction({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        message: preview,
        messageType,
      });
      if (result.via === "cloud_api") {
        toast.success("WhatsApp sent via Business API");
      } else if (result.link) {
        window.open(result.link, "_blank");
        toast.success("Opened WhatsApp — add API keys to send automatically");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WhatsApp send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
        <DialogTitle className="font-heading">WhatsApp Message</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <strong>{client.name}</strong>
            {client.company ? ` — ${client.company}` : ""} | {client.phone}
          </p>
          <Badge variant={whatsappApiEnabled ? "default" : "secondary"} className="text-[0.65rem]">
            {whatsappApiEnabled ? "Business API" : "Link fallback"}
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
        <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap font-sans text-xs">{preview}</pre>
        </div>
      </DialogBody>
      <DialogFooter className="flex-col gap-2 sm:flex-row">
        {onOpenDocument && (
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onOpenDocument(messageType === "receipt" ? "receipt" : "invoice");
            }}
          >
            Open A4 PDF
          </Button>
        )}
        <Button
          className="bg-[#25D366] hover:bg-[#20bd5a]"
          disabled={busy || !client.phone}
          onClick={() => void handleSend()}
        >
          {whatsappApiEnabled ? "Send via WhatsApp API" : "Open WhatsApp"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function WhatsAppDialog({
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
          <WhatsAppForm
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
