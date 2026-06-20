import { PageHeader } from "@/components/layout/page-header";
import { KpiCards, RevenueTicker } from "@/components/dashboard/kpi-cards";
import { PriorityClientTable } from "@/components/dashboard/priority-table";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Space IN Business Center — overview"
      />
      <RevenueTicker />
      <KpiCards />
      <PriorityClientTable />
    </div>
  );
}
