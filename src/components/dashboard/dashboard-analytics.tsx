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
  durationMix,
  revenueByMonth,
  statusBreakdown,
  timelineBuckets,
  topClientsByAmount,
} from "@/lib/analytics";
import { contractOfficeStats, officeDetailsMap } from "@/lib/office-contracts";
import { bhd } from "@/lib/format";
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
import { Skeleton } from "@/components/ui/skeleton";

function truncateLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function DashboardAnalytics() {
  const palette = useChartTheme();
  const {
    clients,
    invoices,
    contracts,
    floors,
    officeOverrides,
    officeDetails,
    isHydrated,
  } = useCrm();

  const revenue = useMemo(() => revenueByMonth(invoices), [invoices]);
  const statusData = useMemo(() => statusBreakdown(clients), [clients]);
  const timeline = useMemo(() => timelineBuckets(clients), [clients]);
  const occupancy = useMemo(() => {
    const s = contractOfficeStats(
      floors,
      officeOverrides,
      contracts,
      officeDetailsMap(officeDetails),
    );
    return {
      rate: s.rate,
      chart: [
        { name: "Rented", value: s.rented, id: "rented" },
        { name: "Available", value: s.free, id: "free" },
        { name: "Restricted", value: s.restricted, id: "restricted" },
      ].filter((d) => d.value > 0),
    };
  }, [floors, officeOverrides, contracts, officeDetails]);

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
  const duration = useMemo(() => durationMix(clients), [clients]);

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const axisProps = {
    tick: { fontSize: 11, fill: palette.mutedForeground },
    axisLine: { stroke: palette.border },
    tickLine: false as const,
  };

  if (!isHydrated) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue by Month"
          subtitle="Billed per cycle"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
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
                        { name: "Revenue", value: bhd(Number(payload[0]?.value ?? 0)) },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {revenue.map((entry) => (
                  <Cell key={entry.key} fill={getRevenueColor(palette, entry.tone)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Office Occupancy" subtitle={`${occupancy.rate}% filled`}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={occupancy.chart}
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
                {occupancy.chart.map((entry) => (
                  <Cell key={entry.id} fill={getOfficeColor(palette, entry.id)} />
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
                  const item = payload[0]?.payload as { name: string; value: number };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[{ name: item.name, value: `${item.value} offices` }]}
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Top Clients"
          subtitle="By outstanding balance"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={topClients}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={(v) => bhd(Number(v))} />
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

        <ChartCard title="Subscription Length" subtitle="Duration mix">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={duration}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
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
                  const item = payload[0]?.payload as { name: string; value: number };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[{ name: item.name, value: `${item.value} clients` }]}
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

      <div className="grid gap-4 md:grid-cols-3">
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
                  <Cell key={entry.id} fill={getStatusColor(palette, entry.id)} />
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
                  const item = payload[0]?.payload as { name: string; value: number };
                  return (
                    <ChartTooltipBox
                      palette={palette}
                      rows={[{ name: item.name, value: String(item.value) }]}
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

        <ChartCard
          title="Due Timeline"
          subtitle="Outstanding by when it's due"
          className="md:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
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
                  const row = payload[0]?.payload as { count: number; amount: number };
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
                  <Cell key={entry.id} fill={getTimelineColor(palette, entry.id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
