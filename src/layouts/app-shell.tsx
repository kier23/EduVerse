import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { role } = useAuth();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/teacher/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Teacher
          </Link>
          <Link to="/student/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Student
          </Link>
          <Link to="/superadmin/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Superadmin
          </Link>
          <span className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
            Role: {role ?? "none"}
          </span>
          <button
            type="button"
            onClick={signOut}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}
