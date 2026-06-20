"use client";

import type { ChartPalette } from "@/components/charts/chart-theme";

export function ChartTooltipBox({
  palette,
  label,
  rows,
}: {
  palette: ChartPalette;
  label?: string;
  rows: { name: string; value: string }[];
}) {
  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{
        background: palette.card,
        borderColor: palette.border,
        color: palette.foreground,
      }}
    >
      {label && (
        <p
          className="mb-1.5 font-medium"
          style={{ color: palette.mutedForeground }}
        >
          {label}
        </p>
      )}
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-4">
            <span style={{ color: palette.mutedForeground }}>{row.name}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
