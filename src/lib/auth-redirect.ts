import type { UserRole } from "@/types/auth";

export function dashboardPathForRole(role: string | null | undefined) {
  switch (role) {
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    case "admin":
    case "superadmin":
      return "/superadmin/dashboard";
    default:
      return "/unauthorized";
  }
}

export function needsProfileCompletion(role: UserRole | null, fullName: string | null | undefined) {
  return (role === "admin" || role === "superadmin") && !fullName?.trim();
}
