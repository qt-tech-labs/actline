"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A section that owns its own data.
 *
 * The server component hands over the first value (so the HTML is complete on the
 * first paint); the client keeps it fresh afterwards. After a mutation the
 * section refetches **its own** endpoint instead of refreshing the whole route:
 * a page-wide `router.refresh()` re-runs every other section's queries, which
 * is a lot of work to change one number.
 *
 * The data can go stale if it changes elsewhere (another tab); the refetch on
 * window focus covers that.
 */
export function useSectionData<T>(initial: T, path: string) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(path, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: T };
      if (json?.data !== undefined) setData(json.data);
    } catch {
      /* keep what we have; the section stays usable offline */
    } finally {
      setRefreshing(false);
    }
  }, [path]);

  // Coming back to the tab: pick up what changed elsewhere.
  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  return { data, setData, refetch, refreshing };
}
