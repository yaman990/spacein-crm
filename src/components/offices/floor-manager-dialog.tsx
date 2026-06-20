"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOffices } from "@/providers/crm-provider";
import type { FloorsMap } from "@/types/office";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FloorManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { floors, saveFloors } = useOffices();
  const floorKeys = useMemo(() => Object.keys(floors), [floors]);
  const [draft, setDraft] = useState<FloorsMap | null>(null);
  const [activeFloor, setActiveFloor] = useState(floorKeys[0] ?? "");
  const [busy, setBusy] = useState(false);

  const working = draft ?? floors;
  const selectedFloor = floorKeys.includes(activeFloor)
    ? activeFloor
    : (floorKeys[0] ?? "");
  const current = working[selectedFloor];

  function ensureDraft() {
    if (!draft) setDraft(structuredClone(floors));
  }

  function addOffice(sectionIdx: number) {
    ensureDraft();
    setDraft((prev) => {
      const next = structuredClone(prev ?? floors);
      const no = prompt("Enter office number (e.g. 512), or — for unnamed:", "");
      if (no === null) return prev;
      next[selectedFloor].sections[sectionIdx].offices.push({
        no: no.trim() || "—",
        st: "unrented",
        co: "",
      });
      return next;
    });
  }

  function removeOffice(sectionIdx: number, officeIdx: number) {
    const sec = (draft ?? floors)[selectedFloor]?.sections[sectionIdx];
    const office = sec?.offices[officeIdx];
    if (!office) return;
    if (
      !confirm(
        `Remove office #${office.no} from "${sec.title}"?\n(This only removes the row — not any client data.)`,
      )
    ) {
      return;
    }
    ensureDraft();
    setDraft((prev) => {
      const next = structuredClone(prev ?? floors);
      next[selectedFloor].sections[sectionIdx].offices.splice(officeIdx, 1);
      return next;
    });
  }

  function addSection() {
    const title = prompt("Section title:", "New Section");
    if (!title?.trim()) return;
    ensureDraft();
    setDraft((prev) => {
      const next = structuredClone(prev ?? floors);
      next[selectedFloor].sections.push({ title: title.trim(), offices: [] });
      return next;
    });
  }

  async function handleSave() {
    if (!draft) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await saveFloors(draft);
      toast.success("Floor structure saved");
      setDraft(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && floorKeys[0]) setActiveFloor(floorKeys[0]);
        if (!next) setDraft(null);
        onOpenChange(next);
      }}
    >
      <DialogContent size="xl" layout="scroll">
        <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
          <DialogTitle className="font-heading">
            Manage Floors &amp; Sections
          </DialogTitle>
          <DialogDescription>
            Add or remove offices and sections for each floor. Changes are saved
            when you click Save Structure.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-5 py-3">
          <Tabs value={selectedFloor} onValueChange={setActiveFloor}>
            <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1 bg-muted p-1">
              {floorKeys.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="h-8 shrink-0 px-3 text-xs sm:text-sm"
                >
                  {working[key].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <DialogBody>
          <div className="space-y-4">
            {current?.sections.map((sec, sIdx) => (
              <div key={`${selectedFloor}-${sIdx}`} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">{sec.title}</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addOffice(sIdx)}
                  >
                    + Office
                  </Button>
                </div>
                <div className="space-y-2">
                  {sec.offices.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No offices — click + Office to add
                    </p>
                  ) : (
                    sec.offices.map((o, oIdx) => (
                      <div
                        key={`${selectedFloor}-${sIdx}-${oIdx}`}
                        className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1.5"
                      >
                        <Input
                          className="h-8 w-24 shrink-0 font-mono text-sm"
                          value={o.no}
                          onChange={(e) => {
                            ensureDraft();
                            setDraft((prev) => {
                              const next = structuredClone(prev ?? floors);
                              next[selectedFloor].sections[sIdx].offices[oIdx].no =
                                e.target.value;
                              return next;
                            });
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                          {o.co || "—"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-destructive"
                          onClick={() => removeOffice(sIdx, oIdx)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full sm:w-auto" onClick={addSection}>
              + Add Section
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !draft} onClick={() => void handleSave()}>
            Save Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
