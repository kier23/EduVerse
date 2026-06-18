import * as React from "react";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-amber-400/20 bg-stone-950/70 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm transition-all placeholder:text-stone-400 focus-visible:border-amber-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
