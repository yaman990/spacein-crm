import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Every invoice and outstanding balance — including closed contracts that still owe"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <InvoicesView />
      </Suspense>
    </div>
  );
}
