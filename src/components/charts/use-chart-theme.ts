"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { CHART_PALETTES, type ChartPalette } from "@/components/charts/chart-theme";

export function useChartTheme(): ChartPalette {
  const { resolvedTheme } = useTheme();

  return useMemo(
    () =>
      resolvedTheme === "dark" ? CHART_PALETTES.dark : CHART_PALETTES.light,
    [resolvedTheme],
  );
}
