import { auth } from "@/lib/auth";
import { fetchCrmData } from "@/actions/crm";
import defaultFloors from "@/data/default-floors.json";
import { AppShell } from "@/components/layout/app-shell";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { CrmProvider, type CrmSnapshot } from "@/providers/crm-provider";
import type { FloorsMap } from "@/types/office";
import { redirect } from "next/navigation";

// Always render with live data — never serve a cached snapshot of the CRM.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptySnapshot: CrmSnapshot = {
  clients: [],
  activityLog: [],
  officeOverrides: {},
  floors: defaultFloors as FloorsMap,
  contracts: [],
  invoices: [],
  officeDetails: [],
  building: null,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let initialData: CrmSnapshot = emptySnapshot;
  let loadError: string | null = null;

  try {
    initialData = await fetchCrmData();
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Could not connect to Supabase CRM tables.";
  }

  return (
    <CrmProvider initialData={initialData}>
      <AppShell>
        {loadError ? <DatabaseSetupBanner message={loadError} /> : null}
        {children}
      </AppShell>
    </CrmProvider>
  );
}
