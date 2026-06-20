"use client";

import { useCallback, useState } from "react";
import { nextSortDirection, type SortDirection } from "@/lib/table-sort";

export function useTableSort<T extends string>(
  defaultKey: T,
  defaultDirection: SortDirection = "asc",
) {
  const [sortKey, setSortKey] = useState<T>(defaultKey);
  const [direction, setDirection] = useState<SortDirection>(defaultDirection);

  const toggleSort = useCallback((key: T) => {
    setDirection((current) => nextSortDirection(sortKey, key, current));
    setSortKey(key);
  }, [sortKey]);

  const resetSort = useCallback(() => {
    setSortKey(defaultKey);
    setDirection(defaultDirection);
  }, [defaultDirection, defaultKey]);

  return { sortKey, direction, toggleSort, resetSort, setSortKey, setDirection };
}
