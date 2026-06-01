import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <GradientBackground>
      <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
        <header className="mb-8 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">
                EduVerse
              </p>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                {title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Role: {role ?? "none"}</Badge>
              <button
                type="button"
                onClick={signOut}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        {children}
      </main>
    </GradientBackground>
  );
}
