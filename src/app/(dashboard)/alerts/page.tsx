"use client";

import { useMemo } from "react";
import { useClients } from "@/providers/crm-provider";
import { statusOf } from "@/lib/client-status";
import { bhd, fmtDate } from "@/lib/format";
import { AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client } from "@/types/client";

export default function AlertsPage() {
  const { clients, isHydrated } = useClients();

  const { overdue, dueSoon } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 7);

    const ov = clients.filter((c) => statusOf(c) === "overdue");
    const ds = clients.filter((c) => {
      if (!c.dueDate || statusOf(c) === "paid" || statusOf(c) === "overdue")
        return false;
      const d = new Date(c.dueDate + "T00:00:00");
      return d >= now && d <= soon;
    });
    return { overdue: ov, dueSoon: ds };
  }, [clients]);

  if (!isHydrated) return <Skeleton className="h-64 w-full" />;

  if (overdue.length === 0 && dueSoon.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Reminders & Alerts"
          description="Clients requiring attention"
        />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            All clear — no overdue or upcoming reminders.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders & Alerts"
        description="Clients requiring attention"
      />
      {overdue.map((c) => (
        <AlertCard key={c.id} client={c} variant="overdue" />
      ))}
      {dueSoon.map((c) => (
        <AlertCard key={c.id} client={c} variant="due" />
      ))}
    </div>
  );
}

function AlertCard({
  client,
  variant,
}: {
  client: Client;
  variant: "overdue" | "due";
}) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = client.dueDate
    ? Math.ceil(
        (new Date(client.dueDate + "T00:00:00").getTime() - now.getTime()) /
          86400000,
      )
    : 0;

  return (
    <Card
      className={
        variant === "overdue"
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-muted/30"
      }
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
              variant === "overdue"
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            {variant === "overdue" ? (
              <AlertTriangle className="size-5" aria-hidden />
            ) : (
              <Clock className="size-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {client.name}
              {client.company ? ` — ${client.company}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {variant === "overdue"
                ? `OVERDUE — ${bhd(client.amount)} was due ${fmtDate(client.dueDate)}`
                : `Due in ${days} day${days === 1 ? "" : "s"} — ${bhd(client.amount)}`}
            </p>
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          <ClientRowActions client={client} />
        </div>
      </CardContent>
    </Card>
  );
}
