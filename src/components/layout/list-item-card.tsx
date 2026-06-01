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
        "rounded-xl border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 hover:bg-white/80 hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
