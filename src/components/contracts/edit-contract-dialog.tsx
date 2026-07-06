"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addMonths } from "@/lib/format";
import { periodAmount } from "@/types/contract";
import type {
  Contract,
  ContractTerm,
  DiscountKind,
  DiscountScope,
  EndAction,
} from "@/types/contract";
import type { Client, ClientType } from "@/types/client";
import type { UpdateContractInput } from "@/actions/contracts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TERMS: ContractTerm[] = [3, 6, 9, 12];

export interface OfficeOption {
  floorKey: string;
  officeNo: string;
  label: string;
}

export function EditContractDialog({
  open,
  onOpenChange,
  contract,
  clients,
  officeOptions,
  canEditFinancials,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
  clients: Client[];
  officeOptions: OfficeOption[];
  /** true while the current period's invoice is unpaid */
  canEditFinancials: boolean;
  onSave: (input: UpdateContractInput) => Promise<void>;
}) {
  const [clientId, setClientId] = useState(contract.clientId);
  const [clientType, setClientType] = useState<ClientType>(
    contract.clientType,
  );
  const [officeKey, setOfficeKey] = useState(
    `${contract.floorKey ?? ""}|${contract.officeNo ?? ""}`,
  );
  const [monthlyRent, setMonthlyRent] = useState(contract.monthlyRent);
  const isFirstPeriod = contract.renewalCount === 0;
  const [months, setMonths] = useState(
    isFirstPeriod ? contract.months : contract.renewalMonths,
  );
  const [startDate, setStartDate] = useState(contract.startDate);
  const [discountValue, setDiscountValue] = useState(contract.discountValue);
  const [discountKind, setDiscountKind] = useState<DiscountKind>(
    contract.discountKind,
  );
  const [discountScope, setDiscountScope] = useState<DiscountScope>(
    contract.discountScope,
  );
  const [endAction, setEndAction] = useState<EndAction>(contract.endAction);
  const [renewalMonths, setRenewalMonths] = useState(contract.renewalMonths);
  const [busy, setBusy] = useState(false);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const discountApplies =
    isFirstPeriod || discountScope === "every_period" ? discountValue : 0;
  const total = periodAmount(monthlyRent, months, discountApplies, discountKind);
  const endDate = startDate ? addMonths(startDate, months) : contract.endDate;

  async function submit() {
    setBusy(true);
    try {
      const [floorKey, officeNo] = officeKey.split("|");
      const input: UpdateContractInput = {
        contractId: contract.id,
        endAction,
        renewalMonths,
      };
      if (canEditFinancials) {
        if (clientId !== contract.clientId) input.clientId = clientId;
        if (officeNo && officeNo !== contract.officeNo) {
          input.floorKey = floorKey;
          input.officeNo = officeNo;
        }
        input.clientType = clientType;
        input.monthlyRent = monthlyRent;
        input.months = months;
        input.startDate = startDate;
        input.discountValue = discountValue;
        input.discountKind = discountKind;
        input.discountScope = discountScope;
      }
      await onSave(input);
      toast.success("Contract updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit contract {contract.contractNo}
          </DialogTitle>
        </DialogHeader>

        {!canEditFinancials && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            This period is already <strong>paid</strong> — only the renewal
            settings can be changed. To correct paid data, close the contract
            and create it again (admin).
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => setClientId(v ?? contract.clientId)}
            >
              <SelectTrigger disabled={!canEditFinancials}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` — ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Client type</Label>
            <Select
              value={clientType}
              onValueChange={(v) =>
                setClientType((v as ClientType) ?? "commercial")
              }
            >
              <SelectTrigger disabled={!canEditFinancials}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Office</Label>
            <Select
              value={officeKey}
              onValueChange={(v) => setOfficeKey(v ?? officeKey)}
            >
              <SelectTrigger disabled={!canEditFinancials}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {officeOptions.map((o) => (
                  <SelectItem
                    key={`${o.floorKey}|${o.officeNo}`}
                    value={`${o.floorKey}|${o.officeNo}`}
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Monthly rent (BHD)</Label>
            <Input
              type="number"
              value={monthlyRent || ""}
              disabled={!canEditFinancials}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label>{isFirstPeriod ? "Contract period" : "Current period"}</Label>
            <Select
              value={String(months)}
              onValueChange={(v) => setMonths(Number(v) || months)}
            >
              <SelectTrigger disabled={!canEditFinancials}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, ...TERMS]
                  .filter((m, i, a) => a.indexOf(m) === i)
                  .map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} month{m > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{isFirstPeriod ? "Start date" : "Period start"}</Label>
            <Input
              type="date"
              value={startDate}
              disabled={!canEditFinancials}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Discount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                className="w-24"
                value={discountValue || ""}
                disabled={!canEditFinancials}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
              <Select
                value={discountKind}
                onValueChange={(v) =>
                  setDiscountKind((v as DiscountKind) ?? "fixed")
                }
              >
                <SelectTrigger className="w-28" disabled={!canEditFinancials}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">BHD</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Discount applies</Label>
            <Select
              value={discountScope}
              onValueChange={(v) =>
                setDiscountScope((v as DiscountScope) ?? "this_period")
              }
            >
              <SelectTrigger disabled={!canEditFinancials}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_period">This period only</SelectItem>
                <SelectItem value="every_period">Every period</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>At end of term</Label>
            <Select
              value={endAction}
              onValueChange={(v) =>
                setEndAction((v as EndAction) ?? "auto_renew")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_renew">Auto-renew</SelectItem>
                <SelectItem value="terminate">Terminate (close)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {endAction === "auto_renew" && (
            <div className="space-y-1">
              <Label>Renewal period</Label>
              <Select
                value={String(renewalMonths)}
                onValueChange={(v) =>
                  setRenewalMonths(Number(v) || renewalMonths)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 6, 9, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} month{m > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {canEditFinancials && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              {startDate} → {endDate}
            </span>
            <span className="font-semibold">
              Corrected invoice:{" "}
              <Badge variant="secondary" className="text-sm">
                {total.toFixed(3)} BHD
              </Badge>
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={submit}>
            {busy ? "Saving…" : "Save corrections"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
