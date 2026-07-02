"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { detailsKey, officeDetailsMap } from "@/lib/office-contracts";
import type { Building, OfficeDetails } from "@/types/contract";
import type { FloorsMap } from "@/types/office";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const numOrUndef = (v: string) => (v === "" ? undefined : Number(v));
const str = (v: number | undefined) => (v != null ? String(v) : "");

export function OfficeSetupDialog({
  open,
  onOpenChange,
  floors,
  building,
  officeDetails,
  onSaveBuilding,
  onSaveOfficeDetails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floors: FloorsMap;
  building: Building | null;
  officeDetails: OfficeDetails[];
  onSaveBuilding: (b: Omit<Building, "id"> & { id?: string }) => Promise<void>;
  onSaveOfficeDetails: (d: OfficeDetails) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {open && (
          <OfficeSetupForm
            floors={floors}
            building={building}
            officeDetails={officeDetails}
            onSaveBuilding={onSaveBuilding}
            onSaveOfficeDetails={onSaveOfficeDetails}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OfficeSetupForm({
  floors,
  building,
  officeDetails,
  onSaveBuilding,
  onSaveOfficeDetails,
}: {
  floors: FloorsMap;
  building: Building | null;
  officeDetails: OfficeDetails[];
  onSaveBuilding: (b: Omit<Building, "id"> & { id?: string }) => Promise<void>;
  onSaveOfficeDetails: (d: OfficeDetails) => Promise<void>;
}) {
  const detailsByKey = useMemo(
    () => officeDetailsMap(officeDetails),
    [officeDetails],
  );
  const floorKeys = useMemo(() => Object.keys(floors), [floors]);

  // --- building (initialised from props on mount) ---
  const [bName, setBName] = useState(building?.name ?? "");
  const [bNo, setBNo] = useState(building?.buildingNo ?? "");
  const [road, setRoad] = useState(building?.roadNo ?? "");
  const [block, setBlock] = useState(building?.blockNo ?? "");
  const [city, setCity] = useState(building?.city ?? "");
  const [country, setCountry] = useState(building?.country ?? "");
  const [savingB, setSavingB] = useState(false);

  // --- office ---
  const [floorKey, setFloorKey] = useState(floorKeys[0] ?? "");
  const [officeNo, setOfficeNo] = useState("");
  const [area, setArea] = useState("");
  const [rate3, setRate3] = useState("");
  const [rate6, setRate6] = useState("");
  const [rate9, setRate9] = useState("");
  const [rate12, setRate12] = useState("");
  const [multi, setMulti] = useState<"no" | "yes">("no");
  const [capacity, setCapacity] = useState("1");
  const [savingO, setSavingO] = useState(false);

  const officeNos = useMemo(() => {
    const f = floors[floorKey];
    if (!f) return [];
    return f.sections
      .flatMap((s) => s.offices.map((o) => o.no))
      .filter((n) => n && n !== "—")
      .sort((a, b) => Number(a) - Number(b));
  }, [floors, floorKey]);

  function loadOffice(fk: string, no: string) {
    const d = detailsByKey.get(detailsKey(fk, no));
    setArea(str(d?.areaSqm));
    setRate3(str(d?.rate3));
    setRate6(str(d?.rate6));
    setRate9(str(d?.rate9));
    setRate12(str(d?.rate12));
    setMulti(d?.multiTenant ? "yes" : "no");
    setCapacity(String(d?.capacity ?? 1));
  }

  async function saveBuilding() {
    setSavingB(true);
    try {
      await onSaveBuilding({
        id: building?.id,
        name: bName.trim(),
        buildingNo: bNo.trim(),
        roadNo: road.trim(),
        blockNo: block.trim(),
        city: city.trim(),
        country: country.trim(),
      });
      toast.success("Building details saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingB(false);
    }
  }

  async function saveOffice() {
    if (!officeNo) return;
    setSavingO(true);
    try {
      await onSaveOfficeDetails({
        floorKey,
        officeNo,
        areaSqm: numOrUndef(area),
        rate3: numOrUndef(rate3),
        rate6: numOrUndef(rate6),
        rate9: numOrUndef(rate9),
        rate12: numOrUndef(rate12),
        multiTenant: multi === "yes",
        capacity: Number(capacity) || 1,
      });
      toast.success(`Office ${officeNo} details saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingO(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          Building &amp; office details
        </DialogTitle>
      </DialogHeader>

      {/* Building address */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Building address (shared by all offices)
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Building name">
            <Input value={bName} onChange={(e) => setBName(e.target.value)} />
          </Field>
          <Field label="Building no.">
            <Input value={bNo} onChange={(e) => setBNo(e.target.value)} />
          </Field>
          <Field label="Road no.">
            <Input value={road} onChange={(e) => setRoad(e.target.value)} />
          </Field>
          <Field label="Block no.">
            <Input value={block} onChange={(e) => setBlock(e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Country">
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={savingB} onClick={saveBuilding}>
            {savingB ? "Saving…" : "Save building"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Office details */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Office details, rates &amp; capacity
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Floor">
            <Select
              value={floorKey}
              onValueChange={(v) => {
                const fk = v ?? "";
                setFloorKey(fk);
                setOfficeNo("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {floorKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {floors[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Office">
            <Select
              value={officeNo}
              onValueChange={(v) => {
                const no = v ?? "";
                setOfficeNo(no);
                if (no) loadOffice(floorKey, no);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select office…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {officeNos.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Area (m²)">
            <Input
              type="number"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={!officeNo}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Rate 3 mo (BHD)">
            <Input
              type="number"
              value={rate3}
              onChange={(e) => setRate3(e.target.value)}
              disabled={!officeNo}
            />
          </Field>
          <Field label="Rate 6 mo">
            <Input
              type="number"
              value={rate6}
              onChange={(e) => setRate6(e.target.value)}
              disabled={!officeNo}
            />
          </Field>
          <Field label="Rate 9 mo">
            <Input
              type="number"
              value={rate9}
              onChange={(e) => setRate9(e.target.value)}
              disabled={!officeNo}
            />
          </Field>
          <Field label="Rate 12 mo">
            <Input
              type="number"
              value={rate12}
              onChange={(e) => setRate12(e.target.value)}
              disabled={!officeNo}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Multi-tenant (shared)">
            <Select
              value={multi}
              onValueChange={(v) => setMulti((v as "no" | "yes") ?? "no")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {multi === "yes" && (
            <Field label="Capacity (max contracts)">
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                disabled={!officeNo}
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end">
          <Button size="sm" disabled={savingO || !officeNo} onClick={saveOffice}>
            {savingO ? "Saving…" : "Save office details"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
