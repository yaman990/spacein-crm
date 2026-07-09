"use client";

import { useMemo } from "react";
import { useClients, useContracts } from "@/providers/crm-provider";
import { statusOf } from "@/lib/client-status";
import { crRegistryState } from "@/lib/cr-registry";
import { categorizeContracts, daysUntil } from "@/lib/contract-checks";
import { bhd, fmtDate } from "@/lib/format";
import { AlertTriangle, Clock, FileWarning, Receipt, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { CrStatusBadge } from "@/components/clients/cr-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client } from "@/types/client";
import type { Contract } from "@/types/contract";

export default function AlertsPage() {
  const { clients, isHydrated } = useClients();
  const { contracts, invoices } = useContracts();

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

  const crAlerts = useMemo(() => {
    const rank = { inactive: 0, expired: 1, expiring: 2 } as const;
    return clients
      .map((c) => ({ client: c, state: crRegistryState(c) }))
      .filter(
        (x): x is { client: Client; state: ReturnType<typeof crRegistryState> } =>
          x.state.level === "inactive" ||
          x.state.level === "expired" ||
          x.state.level === "expiring",
      )
      .sort(
        (a, b) =>
          rank[a.state.level as keyof typeof rank] -
            rank[b.state.level as keyof typeof rank] ||
          (a.state.days ?? 0) - (b.state.days ?? 0),
      );
  }, [clients]);

  const today = new Date().toISOString().slice(0, 10);
  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const { expiringSoon, awaiting, expired } = useMemo(
    () => ({
      expiringSoon: categorizeContracts(contracts, today).expiringSoon,
      awaiting: contracts.filter(
        (c) => c.status === "reserved" || c.status === "renewal_await_payment",
      ),
      expired: contracts.filter((c) => c.status === "expired"),
    }),
    [contracts, today],
  );
  const openAmountByContract = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((i) => {
      if (i.status !== "paid")
        m.set(i.contractId, (m.get(i.contractId) ?? 0) + i.amount);
    });
    return m;
  }, [invoices]);

  if (!isHydrated) return <Skeleton className="h-64 w-full" />;

  const contractAlertCount =
    expiringSoon.length + awaiting.length + expired.length;

  if (
    overdue.length === 0 &&
    dueSoon.length === 0 &&
    contractAlertCount === 0 &&
    crAlerts.length === 0
  ) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Reminders & Alerts"
          description="Clients & contracts requiring attention"
        />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            All clear — no overdue payments, expiring contracts, pending
            renewals or CR issues.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders & Alerts"
        description="Clients & contracts requiring attention"
      />

      {contractAlertCount > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Contracts
          </h2>
          {awaiting.map((c) => (
            <ContractAlertCard
              key={c.id}
              contract={c}
              client={clientById.get(c.clientId)}
              amountDue={openAmountByContract.get(c.id) ?? 0}
              variant="awaiting"
              today={today}
            />
          ))}
          {expired.map((c) => (
            <ContractAlertCard
              key={c.id}
              contract={c}
              client={clientById.get(c.clientId)}
              amountDue={openAmountByContract.get(c.id) ?? 0}
              variant="expired"
              today={today}
            />
          ))}
          {expiringSoon.map((c) => (
            <ContractAlertCard
              key={c.id}
              contract={c}
              client={clientById.get(c.clientId)}
              amountDue={0}
              variant="expiring"
              today={today}
            />
          ))}
        </section>
      )}

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Client payments
          </h2>
          {overdue.map((c) => (
            <AlertCard key={c.id} client={c} variant="overdue" />
          ))}
          {dueSoon.map((c) => (
            <AlertCard key={c.id} client={c} variant="due" />
          ))}
        </section>
      )}

      {crAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Commercial registrations
          </h2>
          {crAlerts.map(({ client, state }) => (
            <CrAlertCard key={client.id} client={client} state={state} />
          ))}
        </section>
      )}
    </div>
  );
}

function CrAlertCard({
  client,
  state,
}: {
  client: Client;
  state: ReturnType<typeof crRegistryState>;
}) {
  const critical = state.level === "inactive" || state.level === "expired";
  const text =
    state.level === "inactive"
      ? `Registry status: ${state.label}${
          client.crExpiry ? ` — CR dated ${fmtDate(client.crExpiry)}` : ""
        }`
      : state.level === "expired"
        ? `CR expired ${client.crExpiry ? fmtDate(client.crExpiry) : ""} — renew before signing or invoicing`
        : `CR expires ${client.crExpiry ? fmtDate(client.crExpiry) : ""}${
            state.days != null ? ` — in ${state.days} day${state.days === 1 ? "" : "s"}` : ""
          }`;

  return (
    <Card
      className={
        critical
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-muted/30"
      }
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
              critical
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            <ScrollText className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {client.company || client.name}
              {client.rank && (
                <Badge
                  variant="outline"
                  className="ml-2 font-mono text-[0.65rem]"
                >
                  CR {client.rank}
                </Badge>
              )}
              <CrStatusBadge client={client} className="ml-1" />
            </p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          <ClientRowActions client={client} />
        </div>
      </CardContent>
    </Card>
  );
}

function ContractAlertCard({
  contract,
  client,
  amountDue,
  variant,
  today,
}: {
  contract: Contract;
  client?: Client;
  amountDue: number;
  variant: "expiring" | "awaiting" | "expired";
  today: string;
}) {
  const days = contract.endDate ? daysUntil(contract.endDate, today) : null;
  const who = client?.company || client?.name || "Unknown client";

  const meta =
    variant === "awaiting"
      ? {
          icon: Receipt,
          cls: "bg-orange-400/15 text-orange-700 dark:text-orange-300",
          card: "border-orange-400/30 bg-orange-400/5",
          text: `${
            contract.status === "reserved" ? "Reserved" : "Renewal"
          } — awaiting payment${
            amountDue > 0 ? ` of ${bhd(amountDue)}` : ""
          } (upload the receipt from the Offices page)`,
        }
      : variant === "expired"
        ? {
            icon: FileWarning,
            cls: "bg-destructive/10 text-destructive",
            card: "border-destructive/20 bg-destructive/5",
            text: `Expired ${fmtDate(contract.endDate)} — renew it or close it to free the office`,
          }
        : {
            icon: Clock,
            cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            card: "border-border bg-muted/30",
            text: `Expires ${fmtDate(contract.endDate)}${
              days != null ? ` — in ${days} day${days === 1 ? "" : "s"}` : ""
            }`,
          };
  const Icon = meta.icon;

  return (
    <Card className={meta.card}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {who}
            <Badge variant="outline" className="ml-2 font-mono text-[0.65rem]">
              {contract.contractNo}
            </Badge>
            {contract.officeNo && (
              <Badge variant="secondary" className="ml-1 text-[0.65rem]">
                Office {contract.officeNo}
              </Badge>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{meta.text}</p>
        </div>
      </CardContent>
    </Card>
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
