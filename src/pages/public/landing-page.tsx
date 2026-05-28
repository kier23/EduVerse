import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-6 text-center">
      <Badge className="mb-4">EduVerse Subject Manager</Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Manage Classes, Materials, and Activities in One Place</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        A teacher/student portal powered by shadcn UI and Supabase for analytics, subject management, scheduling, and learning progress.
      </p>
      <Link to="/login" className={cn(buttonVariants())}>
        Login
      </Link>
    </main>
  );
}
