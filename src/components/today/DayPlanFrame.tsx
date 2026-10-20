"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Wraps the day plan so switching days reads as a move, not a swap: the new
 * day slides in from the direction the user travelled. The first render is
 * still — no animation on the initial paint.
 */
export function DayPlanFrame({ day, children }: { day: number; children: React.ReactNode }) {
  const [previous, setPrevious] = useState(day);
  const direction = day === previous ? 0 : day > previous ? 1 : -1;
  if (day !== previous) setPrevious(day);

  return (
    <div
      key={day}
      className={cn(
        "day-plan-frame",
        direction > 0 && "day-plan-frame-forward",
        direction < 0 && "day-plan-frame-back",
      )}
    >
      {children}
    </div>
  );
}
