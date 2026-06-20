import { statusOf, crExpiryStatus } from "@/lib/client-status";
import type { Client } from "@/types/client";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportClientsCsv(clients: Client[]) {
  const headers = [
    "Name",
    "Company",
    "CR",
    "Office",
    "Phone",
    "Email",
    "Rented By",
    "Amount BHD",
    "Join Date",
    "Due Date",
    "Status",
    "Notes",
  ];
  const rows = clients.map((c) =>
    [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${c.rank || ""}"`,
      `"${c.office || ""}"`,
      `"${c.phone || ""}"`,
      `"${c.email || ""}"`,
      `"${c.rentedBy || ""}"`,
      Number(c.amount || 0).toFixed(3),
      c.joinDate || "",
      c.dueDate || "",
      statusOf(c),
      `"${(c.notes || "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  downloadCsv(
    `SpaceIN_CRM_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  );
}

export function exportCrCsv(clients: Client[]) {
  const headers = [
    "Name",
    "Company",
    "CR Number",
    "CR Expiry",
    "CR Status",
    "Member Since",
    "Contract Due",
    "Contract Status",
    "Amount BHD",
    "Office",
    "Rented By",
  ];
  const rows = clients.map((c) => {
    const crSt = crExpiryStatus(c.crExpiry);
    return [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${c.rank || ""}"`,
      c.crExpiry || "",
      crSt.label,
      c.joinDate || "",
      c.dueDate || "",
      statusOf(c),
      Number(c.amount || 0).toFixed(3),
      `"${c.office || ""}"`,
      `"${c.rentedBy || ""}"`,
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  downloadCsv(
    `SpaceIN_CR_Contracts_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  );
}
