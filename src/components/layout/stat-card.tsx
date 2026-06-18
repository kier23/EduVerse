import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: ReactNode;
  accent?: "indigo" | "violet" | "sky" | "emerald";
};

const accents = {
  indigo: "from-amber-400 via-orange-400 to-yellow-500",
  violet: "from-violet-500 via-indigo-500 to-sky-500",
  sky: "from-sky-400 via-cyan-400 to-blue-500",
  emerald: "from-emerald-400 via-teal-400 to-cyan-500",
};

export function StatCard({ title, value, accent = "indigo" }: StatCardProps) {
  return (
    <Card className="overflow-hidden border border-amber-500/15 bg-stone-950/75 shadow-xl shadow-amber-500/5">
      <div className={cn("h-1 bg-linear-to-r", accents[accent])} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-amber-100/80">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-white">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
