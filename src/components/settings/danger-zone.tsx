"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { resetBusinessDataAction } from "@/actions/crm";
import { useCrm } from "@/providers/crm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PHRASE = "RESET DATA";

export function DangerZone() {
  const { data: session } = useSession();
  const { refresh } = useCrm();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (session?.user?.role !== "admin") return null;

  async function handleReset() {
    if (
      !window.confirm(
        "This permanently deletes ALL clients, contracts, invoices and payments, and empties every office. It cannot be undone. Continue?",
      )
    )
      return;
    try {
      setBusy(true);
      const s = await resetBusinessDataAction(confirm);
      await refresh();
      toast.success(
        `Reset done — cleared ${s.clients} clients, ${s.contracts} contracts, ${s.invoices} invoices, ${s.payments} payments; ${s.offices} offices emptied.`,
      );
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          Danger zone — reset all data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Permanently deletes{" "}
          <strong className="text-foreground">
            all clients, contracts, invoices and payments
          </strong>{" "}
          and empties every office. The office layout, rates, building, users and
          settings are kept. <strong>This cannot be undone</strong> — export a
          backup (e.g. from Reports) first.
        </p>
        <p className="text-xs text-muted-foreground">
          Type{" "}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold">
            {PHRASE}
          </span>{" "}
          to enable the button.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={PHRASE}
            className="w-48"
            autoComplete="off"
          />
          <Button
            variant="destructive"
            disabled={busy || confirm !== PHRASE}
            onClick={handleReset}
          >
            {busy ? "Clearing…" : "Clear all data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
