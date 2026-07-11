export function bhd(amount: number | string | undefined | null): string {
  const n = Number(amount ?? 0);
  return (
    n.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " BHD"
  );
}

export function bhdShort(amount: number): string {
  if (amount >= 1000) return (amount / 1000).toFixed(1) + "K";
  return amount.toFixed(0);
}

export function fmtDate(date?: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayFormatted(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Adds calendar months to an ISO date, clamping to the end of the target month
 * (31 Jan + 1mo → 28/29 Feb, not 2/3 Mar) and computed purely from the date
 * parts so it never drifts with the server timezone.
 */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, day] = dateStr.slice(0, 10).split("-").map(Number);
  const total = m - 1 + months; // 0-based month index from year start
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12; // 0-based target month
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(day, lastDay);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${ny}-${p(nm + 1)}-${p(nd)}`;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
