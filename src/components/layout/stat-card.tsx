import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: ReactNode;
  accent?: "indigo" | "violet" | "sky" | "emerald";
};

const accents = {
  indigo: "from-indigo-500 to-indigo-600",
  violet: "from-violet-500 to-purple-600",
  sky: "from-sky-500 to-blue-600",
  emerald: "from-emerald-500 to-teal-600",
};

export function StatCard({ title, value, accent = "indigo" }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1 bg-gradient-to-r", accents[accent])} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
