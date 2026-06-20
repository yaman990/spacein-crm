import { cn } from "@/lib/utils";

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string | number }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-x-4 gap-y-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>
            {item.label}
            {item.value !== undefined && (
              <span className="ml-1 font-medium text-foreground tabular-nums">
                {item.value}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
