import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GradientBackground({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-100" />
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-violet-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
