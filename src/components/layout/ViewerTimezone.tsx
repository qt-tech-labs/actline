"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROJECT_TZ, TZ_COOKIE } from "@/lib/day";

/**
 * Tells the server which timezone the device is in, so "today" is the day the
 * user sees. The cookie makes the *next* render use the device's clock; the page
 * is only re-rendered when the day itself would differ, so nothing flashes.
 */
export function ViewerTimezone() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;

    const current = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${TZ_COOKIE}=`))
      ?.split("=")[1];
    if (current !== zone) {
      document.cookie = `${TZ_COOKIE}=${zone}; path=/; max-age=31536000; samesite=lax`;
    }

    // Only when the two clocks disagree on the calendar day does the plan shift.
    const deviceDate = new Intl.DateTimeFormat("en-CA").format(new Date());
    const projectDate = new Intl.DateTimeFormat("en-CA", { timeZone: PROJECT_TZ }).format(new Date());
    if (deviceDate !== projectDate) router.refresh();
  }, [router]);

  return null;
}
