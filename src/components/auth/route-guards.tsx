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

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export function RequireCompleteProfile() {
  const { user, role, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparing account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
