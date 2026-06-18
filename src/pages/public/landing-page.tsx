import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <GradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-6 text-center">
        <Badge className="mb-6">EduVerse Subject Manager</Badge>
        <h1 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl text-white">
          Manage Classes, Materials, and Activities{" "}
          <span className="gradient-text">in One Place</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
          A teacher/student portal for analytics, subject management,
          scheduling, and learning progress.
        </p>
        <div className="mb-12 grid w-full max-w-3xl gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="mb-1 text-sm font-medium text-amber-600">
                Teachers
              </p>
              <p className="text-sm text-muted-foreground">
                Manage subjects, activities, and schedules
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="mb-1 text-sm font-medium text-amber-600">
                Students
              </p>
              <p className="text-sm text-muted-foreground">
                View materials, to-dos, and quiz scores
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="mb-1 text-sm font-medium text-amber-600">Admins</p>
              <p className="text-sm text-muted-foreground">
                Oversee accounts and system analytics
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/login" className={cn(buttonVariants({ size: "lg" }))}>
            Log in
          </Link>
          <Link
            to="/signup"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Sign up
          </Link>
        </div>
      </main>
    </GradientBackground>
  );
}
