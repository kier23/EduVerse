import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types/auth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Checking session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RoleGuard({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Checking permissions...</p>;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
