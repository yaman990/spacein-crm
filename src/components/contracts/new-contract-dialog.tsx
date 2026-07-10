"use client";

import { useMemo, useState } from "react";
import { addMonths, bhd } from "@/lib/format";
import { rateForTerm } from "@/lib/office-contracts";
import { monthsBetween } from "@/lib/contract-checks";
import { periodAmount, TERM_PRESETS, PAYMENT_PRESETS } from "@/types/contract";
import type {
  DiscountKind,
  DiscountScope,
  EndAction,
  OfficeDetails,
  Building,
} from "@/types/contract";
import type { Client, ClientType } from "@/types/client";
import type { CreateContractInput } from "@/actions/contracts";
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewContractDialog({
  open,
  onOpenChange,
  floorKey,
  officeNo,
  details,
  building,
  clients,
  onCreate,
  legacyOccupant,
  onMarkFree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorKey: string;
  officeNo: string;
  details?: OfficeDetails;
  building: Building | null;
  clients: Client[];
  onCreate: (input: CreateContractInput) => Promise<void>;
  /** Tenant recorded in the legacy floor data (office has no contract yet). */
  legacyOccupant?: string;
  /** Clears the legacy occupancy and returns the office to Available. */
  onMarkFree?: () => Promise<void>;
}) {
  const [clientId, setClientId] = useState("");
  const [clientType, setClientType] = useState<ClientType>("commercial");
  const [months, setMonths] = useState<number>(12);
  const [customTerm, setCustomTerm] = useState(false);
  const [paymentMonths, setPaymentMonths] = useState<number>(3);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [rentTouched, setRentTouched] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountKind, setDiscountKind] = useState<DiscountKind>("fixed");
  const [discountScope, setDiscountScope] =
    useState<DiscountScope>("this_period");
  const [startDate, setStartDate] = useState(todayISO());
  const [endAction, setEndAction] = useState<EndAction>("auto_renew");
  const [renewalMonths, setRenewalMonths] = useState<number>(12);
  const [busy, setBusy] = useState(false);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const officeRate = rateForTerm(details, months);
  const endDate = startDate ? addMonths(startDate, months) : "";
  // first payment cycle (clamped to the term end)
  const cycleMonthsEff = Math.max(1, Math.min(paymentMonths, months));
  let firstCycleEnd = startDate ? addMonths(startDate, cycleMonthsEff) : "";
  if (endDate && firstCycleEnd > endDate) firstCycleEnd = endDate;
  const firstCycleMonths =
    startDate && firstCycleEnd
      ? Math.max(1, monthsBetween(startDate, firstCycleEnd))
      : cycleMonthsEff;
  const cycleAmount = periodAmount(
    monthlyRent,
    firstCycleMonths,
    discountValue,
    discountKind,
  );
  // whole-term value across all cycles, applying the discount per its scope
  const contractTotal = (() => {
    const base = monthlyRent * months;
    const numCycles = Math.max(1, Math.ceil(months / cycleMonthsEff));
    let t: number;
    if (discountKind === "percent") {
      t =
        discountScope === "every_period"
          ? base * (1 - discountValue / 100)
          : base - monthlyRent * firstCycleMonths * (discountValue / 100);
    } else {
      t =
        base -
        (discountScope === "every_period"
          ? discountValue * numCycles
          : discountValue);
    }
    return Math.max(0, Math.round(t * 1000) / 1000);
  })();

  function applyTerm(m: number) {
    setMonths(m);
    setRenewalMonths(m);
    const r = rateForTerm(details, m);
    if (!rentTouched && r != null) setMonthlyRent(r);
  }

  function selectClient(id: string) {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    if (c?.type) setClientType(c.type);
  }

  async function submit() {
    if (!clientId) return;
    setBusy(true);
    try {
      await onCreate({
        clientId,
        floorKey,
        officeNo,
        clientType,
        monthlyRent: Number(monthlyRent) || 0,
        months: Math.max(1, Number(months) || 12),
        paymentMonths: cycleMonthsEff,
        renewalMonths: Number(renewalMonths) || months,
        discountValue: Number(discountValue) || 0,
        discountKind,
        discountScope,
        startDate,
        endAction,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const addressLine = building
    ? [
        officeNo && `Office ${officeNo}`,
        building.buildingNo && `Bldg ${building.buildingNo}`,
        building.roadNo && `Road ${building.roadNo}`,
        building.blockNo && `Block ${building.blockNo}`,
        building.city,
        building.country,
      ]
        .filter(Boolean)
        .join(" · ")
    : `Office ${officeNo}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            New contract — Office {officeNo}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {addressLine}
          {details?.areaSqm ? ` · ${details.areaSqm} m²` : ""}
        </div>

        {legacyOccupant !== undefined && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-amber-500/70 bg-amber-400/10 p-3 text-xs">
            <span>
              Recorded tenant (no contract yet):{" "}
              <strong>{legacyOccupant || "unknown"}</strong> — create their
              contract below, or mark the office free if they left.
            </span>
            {onMarkFree && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void onMarkFree().then(() => onOpenChange(false));
                }}
              >
                Mark office free
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => selectClient(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
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
              onValueChange={(v) => setClientType(v as ClientType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Contract term (total)</Label>
            <div className="flex gap-2">
              <Select
                value={customTerm ? "custom" : String(months)}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setCustomTerm(true);
                    return;
                  }
                  setCustomTerm(false);
                  applyTerm(Number(v));
                }}
              >
                <SelectTrigger className={customTerm ? "w-28" : "w-full"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERM_PRESETS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} months
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {customTerm && (
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={months || ""}
                  placeholder="months"
                  onChange={(e) =>
                    applyTerm(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Payment terms</Label>
            <Select
              value={String(paymentMonths)}
              onValueChange={(v) => setPaymentMonths(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_PRESETS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    Every {m} month{m > 1 ? "s" : ""} (in advance)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>
              Monthly rent (BHD)
              {officeRate != null && (
                <span className="ml-1 text-[0.65rem] text-muted-foreground">
                  office rate: {officeRate}
                </span>
              )}
            </Label>
            <Input
              type="number"
              value={monthlyRent || ""}
              onChange={(e) => {
                setRentTouched(true);
                setMonthlyRent(Number(e.target.value));
              }}
            />
          </div>

          <div className="space-y-1">
            <Label>Start date</Label>
            <Input
              type="date"
              value={startDate}
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
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
              <Select
                value={discountKind}
                onValueChange={(v) => setDiscountKind(v as DiscountKind)}
              >
                <SelectTrigger className="w-28">
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
              onValueChange={(v) => setDiscountScope(v as DiscountScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_period">This period only</SelectItem>
                <SelectItem value="every_period">Every period</SelectItem>
              </SelectContent>
            </Select>
            {discountKind === "fixed" &&
              discountScope === "every_period" &&
              discountValue > 0 && (
                <p className="text-[0.7rem] text-amber-600 dark:text-amber-400">
                  {bhd(discountValue)} comes off <strong>each</strong> cycle — about{" "}
                  {bhd(
                    discountValue *
                      Math.max(1, Math.ceil(months / cycleMonthsEff)),
                  )}{" "}
                  across the whole term.
                </p>
              )}
          </div>

          <div className="space-y-1">
            <Label>At end of term</Label>
            <Select
              value={endAction}
              onValueChange={(v) => setEndAction(v as EndAction)}
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
                onValueChange={(v) => setRenewalMonths(Number(v))}
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

        <div className="space-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Term: {startDate} → {endDate || "—"} ({months} mo, pays every{" "}
              {cycleMonthsEff} mo)
            </span>
            <span className="font-semibold">
              Contract value:{" "}
              <Badge variant="outline" className="text-sm">
                {contractTotal.toFixed(3)} BHD
              </Badge>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              First invoice: {startDate} → {firstCycleEnd || "—"} · due{" "}
              {startDate} (in advance)
            </span>
            <span className="font-semibold">
              <Badge variant="secondary" className="text-sm">
                {cycleAmount.toFixed(3)} BHD
              </Badge>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !clientId} onClick={submit}>
            {busy ? "Creating…" : "Create contract & issue invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
