import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListItemCard({
  children,
  className,
  as: Component = "div",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "a";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component
      className={cn(
        "rounded-2xl border border-amber-500/15 bg-stone-950/75 p-4 text-amber-50 shadow-lg shadow-amber-500/5 backdrop-blur-md transition-all hover:border-amber-300/30 hover:bg-stone-900/85 hover:shadow-amber-400/10",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
