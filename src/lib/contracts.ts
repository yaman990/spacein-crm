import { crExpiryStatus, daysUntilDue, statusOf } from "@/lib/client-status";
import type { Client } from "@/types/client";

export type CrFilter =
  | "all"
  | "cr-expired"
  | "cr-soon"
  | "contract-overdue"
  | "contract-soon"
  | "no-cr";

export function crContractStats(clients: Client[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const soon30 = new Date(now);
  soon30.setDate(soon30.getDate() + 30);
  const soon60 = new Date(now);
  soon60.setDate(soon60.getDate() + 60);

  let crTotal = 0;
  let crExpired = 0;
  let crSoon = 0;
  let contractOverdue = 0;
  let contractSoon = 0;
  let contractOk = 0;

  clients.forEach((c) => {
    if (c.rank && c.rank !== "-" && c.rank !== "") crTotal++;
    if (c.crExpiry) {
      const d = new Date(c.crExpiry + "T00:00:00");
      if (d < now) crExpired++;
      else if (d <= soon60) crSoon++;
    }
    const s = statusOf(c);
    if (s === "overdue") contractOverdue++;
    else if (s !== "paid" && c.dueDate) {
      const d = new Date(c.dueDate + "T00:00:00");
      if (d >= now && d <= soon30) contractSoon++;
      else if (d > soon30) contractOk++;
    } else if (s === "paid") contractOk++;
  });

  return {
    crTotal,
    crExpired,
    crSoon,
    contractOverdue,
    contractSoon,
    contractOk,
  };
}

export function filterCrClients(clients: Client[], filter: CrFilter): Client[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const soon30 = new Date(now);
  soon30.setDate(soon30.getDate() + 30);
  const soon60 = new Date(now);
  soon60.setDate(soon60.getDate() + 60);

  let list = [...clients];
  if (filter === "cr-expired") {
    list = list.filter(
      (c) => c.crExpiry && new Date(c.crExpiry + "T00:00:00") < now,
    );
  } else if (filter === "cr-soon") {
    list = list.filter((c) => {
      if (!c.crExpiry) return false;
      const d = new Date(c.crExpiry + "T00:00:00");
      return d >= now && d <= soon60;
    });
  } else if (filter === "contract-overdue") {
    list = list.filter((c) => statusOf(c) === "overdue");
  } else if (filter === "contract-soon") {
    list = list.filter((c) => {
      if (!c.dueDate || statusOf(c) === "paid" || statusOf(c) === "overdue")
        return false;
      const d = new Date(c.dueDate + "T00:00:00");
      return d >= now && d <= soon30;
    });
  } else if (filter === "no-cr") {
    list = list.filter((c) => !c.crExpiry);
  }

  return list.sort((a, b) => {
    const aExp = a.crExpiry
      ? new Date(a.crExpiry + "T00:00:00").getTime()
      : new Date("2099-01-01").getTime();
    const bExp = b.crExpiry
      ? new Date(b.crExpiry + "T00:00:00").getTime()
      : new Date("2099-01-01").getTime();
    return aExp - bExp;
  });
}

export function searchCrClients(clients: Client[], query: string): Client[] {
  const q = query.toLowerCase();
  if (!q) return clients;
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.rank.toLowerCase().includes(q) ||
      c.office.includes(q),
  );
}

export { crExpiryStatus, daysUntilDue, statusOf };
