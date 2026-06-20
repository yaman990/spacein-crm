import type { Client, ClientStatus } from "@/types/client";

export function statusOf(client: Client): ClientStatus {
  if (client.status === "paid") return "paid";
  if (!client.dueDate) return client.status || "pending";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(client.dueDate + "T00:00:00") < today) return "overdue";
  return client.status || "pending";
}

export function daysUntilDue(client: Client): number | null {
  if (!client.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(client.dueDate + "T00:00:00").getTime() - today.getTime()) /
      86400000,
  );
}

export function crExpiryStatus(crExpiry?: string | null): {
  label: string;
  days: number | null;
} {
  if (!crExpiry) return { label: "No Date", days: null };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.ceil(
    (new Date(crExpiry + "T00:00:00").getTime() - now.getTime()) / 86400000,
  );
  if (days < 0) return { label: "EXPIRED", days };
  if (days <= 60) return { label: `${days}d`, days };
  return { label: `${days}d`, days };
}

export function sortClientsByPriority(clients: Client[]): Client[] {
  const rank: Record<string, number> = {
    overdue: 0,
    pending: 1,
    sent: 2,
    paid: 3,
  };
  return [...clients].sort((a, b) => {
    const sa = statusOf(a);
    const sb = statusOf(b);
    if ((rank[sa] ?? 9) !== (rank[sb] ?? 9)) {
      return (rank[sa] ?? 9) - (rank[sb] ?? 9);
    }
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}

export function rentedByColor(rentedBy?: string): string {
  if (!rentedBy) return "#706860";
  const n = rentedBy.toUpperCase();
  if (n.includes("AHMED")) return "#e74c3c";
  if (n.includes("HOSSAM")) return "#3a7bd5";
  if (n.includes("YUSUF")) return "#1a9a5c";
  if (n.includes("ABDALLAH")) return "#9b59b6";
  if (n.includes("LEGAL")) return "#c0392b";
  if (n.includes("COLLECTIVE") || n.includes("MEHWAR")) return "#d35400";
  return "#706860";
}
