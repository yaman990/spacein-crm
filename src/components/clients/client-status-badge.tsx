import type { ClientStatus } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const config: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-border bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent",
    className: "border-border bg-muted text-foreground",
  },
  paid: {
    label: "Paid",
    className: "border-border bg-foreground/5 text-foreground",
  },
  overdue: {
    label: "Overdue",
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

export function ClientStatusBadge({
  status,
  className,
}: {
  status: ClientStatus;
  className?: string;
}) {
  const c = config[status] ?? config.pending;
  return (
    <Badge
      variant="outline"
      className={cn("text-[0.65rem] font-medium", c.className, className)}
    >
      {c.label}
    </Badge>
  );
}
