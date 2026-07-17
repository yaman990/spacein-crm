import { PageHeader } from "@/components/layout/page-header";
import { KpiCards, RevenueTicker } from "@/components/dashboard/kpi-cards";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Space IN Business Center — overview"
      />
      <RevenueTicker />
      <KpiCards />
      <DashboardAnalytics />
    </div>
  );
}
