"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Printer, Upload } from "lucide-react";
import type { Building, Contract, Invoice, ContractStatus } from "@/types/contract";
import type { Client } from "@/types/client";
import type { OfficeOccupancy } from "@/lib/office-contracts";
import { openContractPrintWindow } from "@/lib/document-print";
import { bhd } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  reserved: { label: "Reserved — pending payment", cls: "bg-amber-400/20 text-amber-700 dark:text-amber-300" },
  active: { label: "Active", cls: "bg-muted text-muted-foreground" },
  renewal_await_payment: { label: "Renewal — awaiting payment", cls: "bg-orange-400/20 text-orange-700 dark:text-orange-300" },
  expired: { label: "Expired", cls: "bg-destructive/20 text-destructive" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
};

export function ContractDetailDialog({
  open,
  onOpenChange,
  occupancy,
  invoices,
  clients,
  building,
  hasFreeSlot,
  onMarkPaid,
  getReceiptUrl,
  onRenew,
  onClose,
  onEdit,
  onAddContract,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occupancy: OfficeOccupancy | null;
  invoices: Invoice[];
  clients: Client[];
  building: Building | null;
  hasFreeSlot: boolean;
  onMarkPaid: (invoiceId: string, receipt: File) => Promise<void>;
  getReceiptUrl: (invoiceId: string) => Promise<string | null>;
  onRenew: (contractId: string) => Promise<void>;
  onClose: (contractId: string, writeOffUnpaid?: boolean) => Promise<void>;
  onEdit: (contract: Contract) => void;
  onAddContract: () => void;
}) {
  if (!occupancy) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Office {occupancy.officeNo}
            {occupancy.capacity > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {occupancy.used}/{occupancy.capacity} occupied
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {occupancy.contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              client={clients.find((cl) => cl.id === c.clientId)}
              invoices={invoices
                .filter((i) => i.contractId === c.id)
                .sort((a, b) => (a.periodStart < b.periodStart ? -1 : 1))}
              onMarkPaid={onMarkPaid}
              getReceiptUrl={getReceiptUrl}
              onRenew={onRenew}
              onClose={onClose}
              onEdit={onEdit}
              building={building}
            />
          ))}

          {hasFreeSlot && (
            <Button variant="outline" className="w-full" onClick={onAddContract}>
              + Add another contract (shared office)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContractCard({
  contract,
  client,
  invoices,
  onMarkPaid,
  getReceiptUrl,
  onRenew,
  onClose,
  onEdit,
  building,
}: {
  contract: Contract;
  client?: Client;
  invoices: Invoice[];
  onMarkPaid: (invoiceId: string, receipt: File) => Promise<void>;
  getReceiptUrl: (invoiceId: string) => Promise<string | null>;
  onRenew: (contractId: string) => Promise<void>;
  onClose: (contractId: string, writeOffUnpaid?: boolean) => Promise<void>;
  onEdit: (contract: Contract) => void;
  building: Building | null;
}) {
  const meta = STATUS_META[contract.status];
  const [busy, setBusy] = useState<"renew" | "close" | null>(null);

  async function renew() {
    if (!window.confirm("Renew this contract for the next period?")) return;
    setBusy("renew");
    try {
      await onRenew(contract.id);
      toast.success("Contract renewed — new invoice issued (awaiting payment)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renew failed");
    } finally {
      setBusy(null);
    }
  }

  async function close() {
    if (!window.confirm("Close this contract and free the office?")) return;
    const unpaid = invoices
      .filter((i) => i.status === "issued")
      .reduce((s, i) => s + i.amount, 0);
    let writeOff = false;
    if (unpaid > 0) {
      writeOff = window.confirm(
        `This tenant still owes ${bhd(unpaid)}.\n\n` +
          `OK  = write it off (the unpaid invoice is cancelled).\n` +
          `Cancel = keep it as an outstanding balance to collect.`,
      );
    }
    setBusy("close");
    try {
      await onClose(contract.id, writeOff);
      toast.success(
        writeOff
          ? "Contract closed — office freed, unpaid balance written off"
          : "Contract closed — office is now available",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{client?.company || client?.name || "—"}</p>
          <p className="text-xs text-muted-foreground">
            {contract.contractNo} · {contract.clientType} · term{" "}
            {contract.months} mo · pays every{" "}
            {contract.paymentMonths || contract.months} mo ·{" "}
            {contract.startDate} → {contract.endDate}
            {contract.renewalCount > 0 && ` · renewed ×${contract.renewalCount}`}
          </p>
        </div>
        <Badge className={meta.cls} variant="secondary">
          {meta.label}
        </Badge>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2">
        {invoices.length === 0 && (
          <p className="text-xs text-muted-foreground">No invoices.</p>
        )}
        {invoices.map((inv) => (
          <InvoiceRow
            key={inv.id}
            invoice={inv}
            onMarkPaid={onMarkPaid}
            getReceiptUrl={getReceiptUrl}
          />
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => onEdit(contract)}
        >
          Edit
        </Button>
        {client && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openContractPrintWindow(contract, client, building)}
          >
            <Printer className="mr-1 size-3.5" /> Print contract
          </Button>
        )}
        {contract.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={renew}
          >
            {busy === "renew" ? "Renewing…" : "Renew now"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={busy !== null}
          onClick={close}
        >
          {busy === "close" ? "Closing…" : "Close contract"}
        </Button>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  onMarkPaid,
  getReceiptUrl,
}: {
  invoice: Invoice;
  onMarkPaid: (invoiceId: string, receipt: File) => Promise<void>;
  getReceiptUrl: (invoiceId: string) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("The receipt must be a PDF file");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("The receipt must be 1 MB or less");
      return;
    }
    setBusy(true);
    try {
      await onMarkPaid(invoice.id, file);
      toast.success("Invoice marked paid — receipt uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewReceipt() {
    const url = await getReceiptUrl(invoice.id);
    if (url) window.open(url, "_blank");
    else toast.error("Receipt not found");
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {invoice.periodStart} → {invoice.periodEnd}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-semibold tabular-nums">
          {invoice.amount.toFixed(3)} BHD
        </span>
        {invoice.status === "paid" ? (
          <>
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            >
              Paid
            </Badge>
            <Button size="sm" variant="ghost" onClick={viewReceipt}>
              <FileText className="mr-1 size-3.5" /> Receipt
            </Button>
          </>
        ) : invoice.status === "void" ? (
          <Badge variant="outline" className="text-muted-foreground line-through">
            Written off
          </Badge>
        ) : (
          <>
            <Badge variant="outline">Unpaid</Badge>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFile}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 size-3.5" />
              {busy ? "Uploading…" : "Mark paid (upload receipt)"}
            </Button>
          </>
        )}
      </span>
    </div>
  );
}
