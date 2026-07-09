import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { crRegistryState, type CrLevel } from "@/lib/cr-registry";

const styles: Record<CrLevel, string> = {
  valid:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  expiring:
    "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  expired: "border-destructive/25 bg-destructive/10 text-destructive",
  inactive: "border-destructive/25 bg-destructive/10 text-destructive",
  none: "border-border bg-muted text-muted-foreground",
};

/**
 * One badge summarising a client's CR health (registry status + expiry).
 * Pass `hideNone` to render nothing when there is no CR data at all.
 */
export function CrStatusBadge({
  client,
  hideNone = false,
  className,
}: {
  client: { crExpiry?: string | null; crStatus?: string | null };
  hideNone?: boolean;
  className?: string;
}) {
  const state = crRegistryState(client);
  if (hideNone && state.level === "none") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[0.65rem] font-medium",
        styles[state.level],
        className,
      )}
    >
      {state.label}
    </Badge>
  );
}
