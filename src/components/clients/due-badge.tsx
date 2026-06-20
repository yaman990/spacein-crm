import { Badge } from "@/components/ui/badge";

export function DueBadge({
  days,
  warnWithin = 7,
}: {
  days: number;
  warnWithin?: number;
}) {
  if (days < 0)
    return (
      <Badge variant="destructive" className="ml-1 text-[0.6rem]">
        {Math.abs(days)}d OD
      </Badge>
    );
  if (days <= warnWithin)
    return (
      <Badge
        variant="outline"
        className="ml-1 border-amber-500/50 bg-amber-500/10 text-[0.6rem] text-amber-800 dark:text-amber-300"
      >
        {days}d
      </Badge>
    );
  return null;
}

export function CrExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0)
    return (
      <Badge variant="destructive" className="ml-1 text-[0.6rem]">
        Expired
      </Badge>
    );
  if (days <= 60)
    return (
      <Badge
        variant="outline"
        className="ml-1 border-amber-500/50 bg-amber-500/10 text-[0.6rem] text-amber-800 dark:text-amber-300"
      >
        {days}d left
      </Badge>
    );
  return (
    <Badge variant="outline" className="ml-1 text-[0.6rem]">
      {days}d
    </Badge>
  );
}
