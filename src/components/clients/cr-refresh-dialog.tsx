"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCrm } from "@/providers/crm-provider";
import {
  baseDigits,
  parseSijilatCsv,
  type SijilatRecord,
} from "@/lib/cr-registry";
import { fmtDate } from "@/lib/format";
import type { Client } from "@/types/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Change {
  client: Client;
  record: SijilatRecord;
  newExpiry: string;
  newStatus: string;
  expiryChanged: boolean;
  statusChanged: boolean;
}

interface Preview {
  changes: Change[];
  unchanged: number;
  unmatchedClients: Client[];
  extraRecords: number;
  totalRecords: number;
}

function buildPreview(clients: Client[], records: SijilatRecord[]): Preview {
  const byBase = new Map<string, SijilatRecord>();
  for (const r of records) {
    const b = baseDigits(r.crNumber);
    if (b && !byBase.has(b)) byBase.set(b, r);
  }
  const usedBases = new Set<string>();

  const changes: Change[] = [];
  const unmatchedClients: Client[] = [];
  let unchanged = 0;

  for (const client of clients) {
    const b = baseDigits(client.rank);
    if (!b) continue; // no CR number on this client
    const record = byBase.get(b);
    if (!record) {
      unmatchedClients.push(client);
      continue;
    }
    usedBases.add(b);
    const newExpiry = record.expiry || client.crExpiry || "";
    const newStatus = record.statusEn || client.crStatus || "";
    const expiryChanged = !!record.expiry && record.expiry !== (client.crExpiry ?? "");
    const statusChanged =
      !!record.statusEn && record.statusEn !== (client.crStatus ?? "");
    if (expiryChanged || statusChanged) {
      changes.push({
        client,
        record,
        newExpiry,
        newStatus,
        expiryChanged,
        statusChanged,
      });
    } else {
      unchanged++;
    }
  }

  const extraRecords = [...byBase.keys()].filter((b) => !usedBases.has(b)).length;
  return {
    changes,
    unchanged,
    unmatchedClients,
    extraRecords,
    totalRecords: records.length,
  };
}

export function CrRefreshDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { clients, applyCrUpdates } = useCrm();
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<SijilatRecord[] | null>(null);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => (records ? buildPreview(clients, records) : null),
    [clients, records],
  );

  function reset() {
    setFileName("");
    setRecords(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseSijilatCsv(text);
      if (parsed.length === 0) {
        toast.error(
          "No CR records found in that file — is it the Sijilat export CSV?",
        );
        return;
      }
      setFileName(file.name);
      setRecords(parsed);
    } catch {
      toast.error("Could not read that file.");
    }
  }

  async function handleApply() {
    if (!preview || preview.changes.length === 0) return;
    try {
      setApplying(true);
      const n = await applyCrUpdates(
        preview.changes.map((c) => ({
          id: c.client.id,
          crExpiry: c.newExpiry,
          crStatus: c.newStatus,
        })),
      );
      toast.success(`Updated CR data for ${n} client${n === 1 ? "" : "s"}`);
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" layout="scroll">
        <DialogHeader className="space-y-1 border-b px-5 pt-5 pb-4 pr-12">
          <DialogTitle className="text-lg font-semibold">
            Refresh CR data from Sijilat
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Upload the <span className="font-mono">sijilat-cr-data.csv</span>{" "}
            export. Clients are matched by CR number; only the expiry date and
            registry status are updated.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              {fileName ? "Choose a different file" : "Choose CSV file"}
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">
                {fileName} — {preview?.totalRecords ?? 0} records
              </span>
            )}
          </div>

          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat n={preview.changes.length} label="To update" tone="accent" />
                <Stat n={preview.unchanged} label="Already current" />
                <Stat
                  n={preview.unmatchedClients.length}
                  label="Clients not in file"
                />
                <Stat n={preview.extraRecords} label="Records unused" />
              </div>

              {preview.changes.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <div className="max-h-[42vh] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur">
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>CR</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.changes.map((c) => (
                          <TableRow key={c.client.id}>
                            <TableCell className="max-w-[160px] truncate">
                              <p className="truncate font-medium">
                                {c.client.company || c.client.name}
                              </p>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {c.client.rank}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {c.expiryChanged ? (
                                <span>
                                  <span className="text-muted-foreground line-through">
                                    {c.client.crExpiry
                                      ? fmtDate(c.client.crExpiry)
                                      : "—"}
                                  </span>{" "}
                                  <span className="font-medium">
                                    {c.newExpiry ? fmtDate(c.newExpiry) : "—"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {c.client.crExpiry
                                    ? fmtDate(c.client.crExpiry)
                                    : "—"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.statusChanged ? (
                                <span className="font-medium">
                                  {c.newStatus}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {c.client.crStatus || "—"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Everything is already up to date — nothing to change.
                </p>
              )}

              {preview.unmatchedClients.length > 0 && (
                <details className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    {preview.unmatchedClients.length} client
                    {preview.unmatchedClients.length === 1 ? "" : "s"} with a CR
                    number weren&apos;t in this file
                  </summary>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {preview.unmatchedClients.slice(0, 40).map((c) => (
                      <li key={c.id}>
                        <span className="font-mono text-xs">{c.rank}</span> —{" "}
                        {c.company || c.name}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applying || !preview || preview.changes.length === 0}
          >
            {applying
              ? "Applying…"
              : preview
                ? `Apply ${preview.changes.length} update${
                    preview.changes.length === 1 ? "" : "s"
                  }`
                : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone?: "accent";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p
        className={`text-xl font-semibold ${
          tone === "accent" && n > 0 ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {n}
      </p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}
