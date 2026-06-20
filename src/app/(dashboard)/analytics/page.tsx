"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCrm } from "@/providers/crm-provider";
import {
  contractsExpiringSoon,
  durationMix,
  employeeLeaderboard,
  occupancyStats,
  revenueByMonth,
  statusBreakdown,
  timelineBuckets,
  topClientsByAmount,
} from "@/lib/analytics";
import { bhd, fmtDate } from "@/lib/format";
import { statusOf } from "@/lib/client-status";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartLegend } from "@/components/charts/chart-legend";
import { ChartTooltipBox } from "@/components/charts/chart-tooltip";
import {
  getOfficeColor,
  getRevenueColor,
  getStatusColor,
  getTimelineColor,
} from "@/components/charts/chart-theme";
import { useChartTheme } from "@/components/charts/use-chart-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { Badge } from "@/components/ui/badge";

function truncateLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default function AnalyticsPage() {
  const palette = useChartTheme();
  const { clients, floors, officeOverrides } = useCrm();

  const revenue = useMemo(() => revenueByMonth(clients), [clients]);
  const statusData = useMemo(() => statusBreakdown(clients), [clients]);
  const timeline = useMemo(() => timelineBuckets(clients), [clients]);
  const duration = useMemo(() => durationMix(clients), [clients]);
  const occupancy = useMemo(
    () => occupancyStats(floors, officeOverrides),
    [floors, officeOverrides],
  );
  const topClients = useMemo(
    () =>
      topClientsByAmount(clients, 8).map((c) => ({
        id: c.id,
        name: truncateLabel(c.name),
        fullName: c.name,
        amount: Number(c.amount || 0),
      })),
    [clients],
  );
  const leaderboard = useMemo(
    () => employeeLeaderboard(clients),
    [clients],
  );
  const expiring = useMemo(
    () => contractsExpiringSoon(clients, 30),
    [clients],
  );

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const axisProps = {
    tick: { fontSize: 11, fill: palette.mutedForeground },
    axisLine: { stroke: palette.border },
    tickLine: false as const,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Insights"
        description="Revenue tracking, employee performance & occupancy"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue by Due Month"
          subtitle="Last 12 months"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke={palette.grid}
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis
                {...axisProps}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                width={36}
              />
              <Tooltip
                cursor={{ fill: palette.grid, opacity: 0.5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      label={String(label)}
                      rows={[
                        {
                          name: "Revenue",
                          value: bhd(Number(payload[0]?.value ?? 0)),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {revenue.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={getRevenueColor(palette, entry.tone)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Status" subtitle="Client breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={1}
                stroke={palette.card}
                strokeWidth={2}
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={getStatusColor(palette, entry.id)}
                  />
                ))}
              </Pie>
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={palette.foreground}
                fontSize={22}
                fontWeight={600}
              >
                {statusTotal}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={palette.mutedForeground}
                fontSize={11}
              >
                clients
              </text>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as {
                    name: string;
                    value: number;
                  };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[
                        { name: item.name, value: String(item.value) },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegend
            className="mt-3"
            items={statusData.map((d) => ({
              label: d.name,
              color: getStatusColor(palette, d.id),
              value: d.value,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Due Timeline" subtitle="Unpaid contracts">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke={palette.grid}
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                {...axisProps}
                interval={0}
                tick={{ fontSize: 10, fill: palette.mutedForeground }}
              />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
              <Tooltip
                cursor={{ fill: palette.grid, opacity: 0.5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as {
                    count: number;
                    amount: number;
                  };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      label={String(label)}
                      rows={[
                        { name: "Clients", value: String(row.count) },
                        { name: "Amount", value: bhd(row.amount) },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {timeline.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={getTimelineColor(palette, entry.id)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subscription Length" subtitle="Duration mix">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={duration}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={1}
                stroke={palette.card}
                strokeWidth={2}
              >
                {duration.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={palette.series[i % palette.series.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as {
                    name: string;
                    value: number;
                  };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[
                        { name: item.name, value: `${item.value} clients` },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegend
            className="mt-3"
            items={duration.map((d, i) => ({
              label: d.name,
              color: palette.series[i % palette.series.length],
              value: d.value,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Office Occupancy" subtitle={`${occupancy.rate}% filled`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={occupancy.chart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={1}
                stroke={palette.card}
                strokeWidth={2}
              >
                {occupancy.chart.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={getOfficeColor(palette, entry.id)}
                  />
                ))}
              </Pie>
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={palette.foreground}
                fontSize={22}
                fontWeight={600}
              >
                {occupancy.rate}%
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={palette.mutedForeground}
                fontSize={11}
              >
                occupied
              </text>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as {
                    name: string;
                    value: number;
                  };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[
                        { name: item.name, value: `${item.value} offices` },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegend
            className="mt-3"
            items={occupancy.chart.map((d) => ({
              label: d.name,
              color: getOfficeColor(palette, d.id),
              value: d.value,
            }))}
          />
        </ChartCard>

        <ChartCard title="Top Clients" subtitle="By contract value">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={topClients}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                stroke={palette.grid}
                strokeDasharray="4 4"
                horizontal={false}
              />
              <XAxis
                type="number"
                {...axisProps}
                tickFormatter={(v) => bhd(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                {...axisProps}
                width={88}
                tick={{ fontSize: 10, fill: palette.mutedForeground }}
              />
              <Tooltip
                cursor={{ fill: palette.grid, opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as {
                    fullName: string;
                    amount: number;
                  };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      label={item.fullName}
                      rows={[{ name: "Amount", value: bhd(item.amount) }]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="amount"
                fill={palette.primary}
                radius={[0, 3, 3, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">
            Employee Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rental data yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((emp, i) => (
                <div
                  key={emp.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <span className="w-6 text-center text-sm font-medium text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      background: palette.series[i % palette.series.length],
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.count} client{emp.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {bhd(emp.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Contracts Expiring in 30 Days
            </CardTitle>
            <Badge variant="secondary">
              {expiring.length} client{expiring.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-80 space-y-2 overflow-y-auto p-4">
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contracts expiring in the next 30 days
            </p>
          ) : (
            expiring.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.company || "—"} · Office #{c.office || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {fmtDate(c.dueDate)}
                  </span>
                  <ClientStatusBadge status={statusOf(c)} />
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {bhd(c.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
