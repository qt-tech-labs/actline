"use client";

import { useEffect, useState } from "react";
import { PROJECT_TZ } from "@/lib/day";

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: PROJECT_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Ticks once per second on the client; renders nothing until mounted to avoid hydration drift. */
export function LiveClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now ?? "--:--:--"}</span>;
}
