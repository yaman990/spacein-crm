import { statusOf } from "@/lib/client-status";
import type { Client } from "@/types/client";
import type { FloorsMap, OfficeOverrides } from "@/types/office";

const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function revenueByMonth(clients: Client[]) {
  const months: Record<string, number> = {};
  clients.forEach((c) => {
    if (!c.dueDate) return;
    const m = c.dueDate.slice(0, 7);
    months[m] = (months[m] || 0) + Number(c.amount || 0);
  });
  const keys = Object.keys(months).sort();
  const displayKeys = keys.length > 14 ? keys.slice(-14) : keys;
  const curMonth = new Date().toISOString().slice(0, 7);

  return displayKeys.map((key) => {
    const [, m] = key.split("-");
    const y = key.slice(0, 4);
    return {
      key,
      label: `${MONTHS[parseInt(m, 10)]} '${y.slice(2)}`,
      amount: months[key],
      tone: key < curMonth ? "past" : key === curMonth ? "current" : "future",
    };
  });
}

export function statusBreakdown(clients: Client[]) {
  const counts = { paid: 0, pending: 0, overdue: 0, sent: 0 };
  clients.forEach((c) => {
    const s = statusOf(c);
    counts[s] = (counts[s] || 0) + 1;
  });
  return [
    { name: "Paid", value: counts.paid, id: "paid" },
    { name: "Pending", value: counts.pending, id: "pending" },
    { name: "Overdue", value: counts.overdue, id: "overdue" },
    { name: "Sent", value: counts.sent, id: "sent" },
  ].filter((d) => d.value > 0);
}

export function timelineBuckets(clients: Client[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = [
    { label: "Overdue", count: 0, amount: 0, id: "overdue" },
    { label: "This Month", count: 0, amount: 0, id: "current" },
    { label: "1–3 Months", count: 0, amount: 0, id: "soon" },
    { label: "3–6 Months", count: 0, amount: 0, id: "mid" },
    { label: "6–12 Months", count: 0, amount: 0, id: "later" },
    { label: "12+ Months", count: 0, amount: 0, id: "far" },
  ];

  clients.forEach((c) => {
    if (!c.dueDate || statusOf(c) === "paid") return;
    const months =
      (new Date(c.dueDate + "T00:00:00").getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24 * 30.5);
    const amt = Number(c.amount || 0);
    if (months < 0) {
      buckets[0].count++;
      buckets[0].amount += amt;
    } else if (months < 1) {
      buckets[1].count++;
      buckets[1].amount += amt;
    } else if (months < 3) {
      buckets[2].count++;
      buckets[2].amount += amt;
    } else if (months < 6) {
      buckets[3].count++;
      buckets[3].amount += amt;
    } else if (months < 12) {
      buckets[4].count++;
      buckets[4].amount += amt;
    } else {
      buckets[5].count++;
      buckets[5].amount += amt;
    }
  });

  return buckets;
}

export function durationMix(clients: Client[]) {
  const dist: Record<string, number> = {};
  clients.forEach((c) => {
    const m = c.rentMonths || 12;
    const lbl =
      m <= 1
        ? "1 Month"
        : m <= 3
          ? "2-3 Mo"
          : m <= 6
            ? "6 Mo"
            : m <= 12
              ? "12 Mo"
              : "24+ Mo";
    dist[lbl] = (dist[lbl] || 0) + 1;
  });
  return Object.entries(dist).map(([name, value]) => ({
    name,
    value,
  }));
}

export function occupancyStats(
  floors: FloorsMap,
  officeOverrides: OfficeOverrides,
) {
  let rented = 0;
  let free = 0;
  let restricted = 0;
  Object.entries(floors).forEach(([fk, floor]) => {
    floor.sections.forEach((sec) =>
      sec.offices.forEach((o) => {
        const st = officeOverrides[`${fk}_${o.no}`] || o.st;
        if (st === "rented") rented++;
        else if (st === "restricted") restricted++;
        else free++;
      }),
    );
  });
  const total = rented + free + restricted;
  return {
    rented,
    free,
    restricted,
    total,
    rate: total > 0 ? Math.round((rented / total) * 100) : 0,
    chart: [
      { name: "Rented", value: rented, id: "rented" },
      { name: "Available", value: free, id: "free" },
      { name: "Restricted", value: restricted, id: "restricted" },
    ].filter((d) => d.value > 0),
  };
}

export function topClientsByAmount(clients: Client[], limit = 10) {
  return [...clients]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, limit);
}

export function employeeLeaderboard(clients: Client[]) {
  const emp: Record<string, { count: number; revenue: number }> = {};
  clients.forEach((c) => {
    if (!c.rentedBy) return;
    const key = c.rentedBy.toUpperCase().split(/[\s\-()]+/)[0];
    if (!emp[key]) emp[key] = { count: 0, revenue: 0 };
    emp[key].count++;
    emp[key].revenue += Number(c.amount || 0);
  });
  return Object.entries(emp)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function contractsExpiringSoon(clients: Client[], days = 30) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return clients
    .filter((c) => {
      if (!c.dueDate || statusOf(c) === "paid") return false;
      const d = new Date(c.dueDate + "T00:00:00");
      return d >= now && d <= end;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
