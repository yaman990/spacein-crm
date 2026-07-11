"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARRANGE_GROUPS, type ArrangeFilter } from "@/lib/client-arrange";

/** Shared "Arrange by" control — filter clients by CR, payment or lease. */
export function ArrangeFilterSelect({
  value,
  onChange,
  className,
}: {
  value: ArrangeFilter;
  onChange: (value: ArrangeFilter) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ArrangeFilter)}>
      <SelectTrigger className={className ?? "w-full sm:w-56"}>
        <SelectValue placeholder="Arrange by…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All clients</SelectItem>
        {ARRANGE_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectSeparator />
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
