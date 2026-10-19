import { cn } from "@/lib/cn";

export function Card({
  className,
  as: Tag = "div",
  ...props
}: React.ComponentProps<"div"> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag
      className={cn("rounded-xl border border-card-border bg-surface-container-lowest shadow-[0_1px_3px_rgba(30,38,33,0.04)]", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-space-sm flex items-center justify-between border-b border-surface-variant pb-space-xs", className)} {...props} />;
}

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("rounded bg-primary-fixed px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-primary-fixed", className)} {...props} />;
}
