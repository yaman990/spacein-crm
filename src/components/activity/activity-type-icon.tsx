import {
  Banknote,
  FileText,
  Mail,
  MessageCircle,
  Receipt,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType } from "@/types/activity";
import { cn } from "@/lib/utils";

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  paid: Banknote,
  invoice: FileText,
  wa: MessageCircle,
  email: Mail,
  created: UserPlus,
  receipt: Receipt,
};

export function ActivityTypeIcon({
  type,
  className,
}: {
  type: ActivityType;
  className?: string;
}) {
  const Icon = ACTIVITY_TYPE_ICONS[type];
  return (
    <Icon
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
      aria-hidden
    />
  );
}
