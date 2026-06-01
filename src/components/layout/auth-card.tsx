import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  backTo,
}: {
  title: string;
  description: string;
  children: ReactNode;
  backTo?: string;
}) {
  return (
    <GradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
        {backTo ? (
          <Link to={backTo} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 w-fit gap-1.5")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        ) : null}
        <Card className="w-full border-white/60 shadow-xl shadow-indigo-500/10">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </GradientBackground>
  );
}
