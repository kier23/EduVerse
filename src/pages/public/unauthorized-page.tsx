import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";

export function UnauthorizedPage() {
  return (
    <GradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-2xl text-white">
              !
            </div>
            <h1 className="text-2xl font-bold">Unauthorized</h1>
            <p className="text-sm text-muted-foreground">Your account does not have access to this route.</p>
            <Link to="/login" className={cn(buttonVariants())}>
              Back to login
            </Link>
          </CardContent>
        </Card>
      </main>
    </GradientBackground>
  );
}
