export type ChartPalette = {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  quinary: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  grid: string;
  card: string;
  revenuePast: string;
  revenueCurrent: string;
  revenueFuture: string;
  statusPaid: string;
  statusPending: string;
  statusOverdue: string;
  statusSent: string;
  officeRented: string;
  officeFree: string;
  officeRestricted: string;
  timelineOverdue: string;
  timelineCurrent: string;
  timelineSoon: string;
  timelineMid: string;
  timelineLater: string;
  timelineFar: string;
  series: string[];
};

/** Semantic colors — each hue maps to meaning (status, urgency, occupancy). */
export const CHART_PALETTES: Record<"light" | "dark", ChartPalette> = {
  light: {
    primary: "#4f46e5",
    secondary: "#0891b2",
    tertiary: "#7c3aed",
    quaternary: "#059669",
    quinary: "#d97706",
    foreground: "#0f172a",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    grid: "#f1f5f9",
    card: "#ffffff",
    revenuePast: "#94a3b8",
    revenueCurrent: "#2563eb",
    revenueFuture: "#38bdf8",
    statusPaid: "#16a34a",
    statusPending: "#d97706",
    statusOverdue: "#dc2626",
    statusSent: "#2563eb",
    officeRented: "#16a34a",
    officeFree: "#cbd5e1",
    officeRestricted: "#ea580c",
    timelineOverdue: "#dc2626",
    timelineCurrent: "#ea580c",
    timelineSoon: "#d97706",
    timelineMid: "#2563eb",
    timelineLater: "#0891b2",
    timelineFar: "#7c3aed",
    series: ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706"],
  },
  dark: {
    primary: "#818cf8",
    secondary: "#22d3ee",
    tertiary: "#a78bfa",
    quaternary: "#34d399",
    quinary: "#fbbf24",
    foreground: "#f8fafc",
    mutedForeground: "#94a3b8",
    border: "#334155",
    grid: "#1e293b",
    card: "#0f172a",
    revenuePast: "#64748b",
    revenueCurrent: "#60a5fa",
    revenueFuture: "#38bdf8",
    statusPaid: "#4ade80",
    statusPending: "#fbbf24",
    statusOverdue: "#f87171",
    statusSent: "#60a5fa",
    officeRented: "#4ade80",
    officeFree: "#475569",
    officeRestricted: "#fb923c",
    timelineOverdue: "#f87171",
    timelineCurrent: "#fb923c",
    timelineSoon: "#fbbf24",
    timelineMid: "#60a5fa",
    timelineLater: "#22d3ee",
    timelineFar: "#a78bfa",
    series: ["#60a5fa", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24"],
  },
};

export function getStatusColor(
  palette: ChartPalette,
  id: string,
): string {
  switch (id) {
    case "paid":
      return palette.statusPaid;
    case "pending":
      return palette.statusPending;
    case "overdue":
      return palette.statusOverdue;
    case "sent":
      return palette.statusSent;
    default:
      return palette.secondary;
  }
}

export function getOfficeColor(
  palette: ChartPalette,
  id: string,
): string {
  switch (id) {
    case "rented":
      return palette.officeRented;
    case "free":
      return palette.officeFree;
    case "restricted":
      return palette.officeRestricted;
    default:
      return palette.tertiary;
  }
}

export function getRevenueColor(
  palette: ChartPalette,
  tone: string,
): string {
  if (tone === "current") return palette.revenueCurrent;
  if (tone === "future") return palette.revenueFuture;
  return palette.revenuePast;
}

export function getTimelineColor(
  palette: ChartPalette,
  id: string,
): string {
  switch (id) {
    case "overdue":
      return palette.timelineOverdue;
    case "current":
      return palette.timelineCurrent;
    case "soon":
      return palette.timelineSoon;
    case "mid":
      return palette.timelineMid;
    case "later":
      return palette.timelineLater;
    case "far":
      return palette.timelineFar;
    default:
      return palette.secondary;
  }
}
