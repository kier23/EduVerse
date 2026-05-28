import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Unauthorized</h1>
      <p className="text-sm text-muted-foreground">Your account does not have access to this route.</p>
      <Link to="/login" className={cn(buttonVariants())}>
        Back to login
      </Link>
    </main>
  );
}
