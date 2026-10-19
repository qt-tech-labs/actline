import { cn } from "@/lib/cn";

/** Material Symbols (ligature font, self-hosted via next/font). Decorative: always aria-hidden. */
export function Icon({ name, fill, className }: { name: string; fill?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("material-symbols-outlined", fill && "fill", className)}>
      {name}
    </span>
  );
}
