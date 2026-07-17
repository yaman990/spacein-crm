import { PageHeader } from "@/components/layout/page-header";
import { InvoicesView } from "@/components/invoices/invoices-view";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Every invoice and outstanding balance — including closed contracts that still owe"
      />
      <InvoicesView />
    </div>
  );
}
