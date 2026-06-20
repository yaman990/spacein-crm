import { Badge } from "@/components/ui/badge";

export function RentedByTag({ rentedBy }: { rentedBy?: string }) {
  if (!rentedBy) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      className="max-w-[120px] truncate text-[0.63rem] font-semibold"
      title={rentedBy}
    >
      {rentedBy}
    </Badge>
  );
}
