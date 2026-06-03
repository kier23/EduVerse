import { Navigate, Outlet } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { GradientBackground } from "@/components/layout/gradient-background";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types/auth";

function LoadingScreen({ message }: { message: string }) {
  return (
    <GradientBackground>
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {message}
          </CardContent>
        </Card>
      </main>
    </GradientBackground>
  );
}

// Only this guard checks loading. By the time it clears, both session AND
// profile are resolved — so child guards never see a null role flash.
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Never checks loading — ProtectedRoute already guarantees it's false here.
export function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function RequireCompleteProfile() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
