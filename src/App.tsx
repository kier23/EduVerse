import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RoleGuard } from "@/components/auth/route-guards";
import { AuthProvider } from "@/providers/auth-provider";
import { LoginPage } from "@/pages/auth/login-page";
import { LandingPage } from "@/pages/public/landing-page";
import { UnauthorizedPage } from "@/pages/public/unauthorized-page";
import { StudentDashboardPage } from "@/pages/student/dashboard-page";
import { StudentSubjectPage } from "@/pages/student/subject-page";
import { AccountsManagementPage } from "@/pages/superadmin/accounts-management-page";
import { SuperadminDashboardPage } from "@/pages/superadmin/dashboard-page";
import { TeacherCalendarPage } from "@/pages/teacher/calendar-page";
import { TeacherDashboardPage } from "@/pages/teacher/dashboard-page";
import { ManageSubjectsPage } from "@/pages/teacher/manage-subjects-page";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRoles={["teacher"]} />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/subjects" element={<ManageSubjectsPage />} />
              <Route path="/teacher/calendar" element={<TeacherCalendarPage />} />
            </Route>
            <Route element={<RoleGuard allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/subject" element={<StudentSubjectPage />} />
            </Route>
            <Route element={<RoleGuard allowedRoles={["superadmin"]} />}>
              <Route path="/superadmin/dashboard" element={<SuperadminDashboardPage />} />
              <Route path="/superadmin/accounts" element={<AccountsManagementPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
