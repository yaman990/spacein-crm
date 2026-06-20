import { Ban, Circle, CircleDot } from "lucide-react";
import type { OfficeStatus } from "@/types/office";
import { cn } from "@/lib/utils";

export function OfficeStatusIndicator({
  status,
  className,
}: {
  status: OfficeStatus;
  className?: string;
}) {
  const iconClass = cn("size-3.5 shrink-0", className);

  switch (status) {
    case "rented":
      return <CircleDot className={cn(iconClass, "text-foreground")} aria-hidden />;
    case "unrented":
      return (
        <Circle className={cn(iconClass, "text-muted-foreground")} aria-hidden />
      );
    case "restricted":
      return <Ban className={cn(iconClass, "text-destructive")} aria-hidden />;
  }
}
