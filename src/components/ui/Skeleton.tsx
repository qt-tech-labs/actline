import { cn } from "@/lib/cn";

/** Fixed-height placeholder so streamed sections don't shift the layout when they arrive. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-surface-container", className)} />;
}
