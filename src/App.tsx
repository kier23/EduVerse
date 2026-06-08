import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  ProtectedRoute,
  RequireCompleteProfile,
  RoleGuard,
} from "@/components/auth/route-guards";
import { AuthProvider } from "@/providers/auth-provider";
import { LoginPage } from "@/pages/auth/login-page";
import { SignupPage } from "@/pages/auth/signup-page";
import { LandingPage } from "@/pages/public/landing-page";
import { UnauthorizedPage } from "@/pages/public/unauthorized-page";
import { StudentDashboardPage } from "@/pages/student/dashboard-page";
import { StudentSubjectPage } from "@/pages/student/subject-page";
import { StudentQuizPage } from "@/pages/student/quiz-page";
import { StudentCalendarPage } from "@/pages/student/calendar-page";
import { AccountsManagementPage } from "@/pages/superadmin/accounts-management-page";
import { SuperadminDashboardPage } from "@/pages/superadmin/dashboard-page";
import { TeacherCalendarPage } from "@/pages/teacher/calendar-page";
import { TeacherDashboardPage } from "@/pages/teacher/dashboard-page";
import { TeacherSubjectPage } from "@/pages/teacher/subjects/subject-page";
import QuizzesPage from "@/pages/teacher/quizzes/page";
import QuizEditorPage from "@/pages/teacher/quizzes/[id]/edit";
import QuizResponsesPage from "@/pages/teacher/quizzes/[id]/responses";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRoles={["teacher"]} />}>
              <Route
                path="/teacher/dashboard"
                element={<TeacherDashboardPage />}
              />
              <Route
                path="/teacher/subjects"
                element={<TeacherSubjectPage />}
              />
              <Route
                path="/teacher/subjects/:subjectId"
                element={<TeacherSubjectPage />}
              />
              <Route
                path="/teacher/calendar"
                element={<TeacherCalendarPage />}
              />
              <Route path="/teacher/quizzes" element={<QuizzesPage />} />
              <Route
                path="/teacher/quizzes/:id/edit"
                element={<QuizEditorPage />}
              />
              <Route
                path="/teacher/quizzes/:id/responses"
                element={<QuizResponsesPage />}
              />
            </Route>
            <Route element={<RoleGuard allowedRoles={["student"]} />}>
              <Route
                path="/student/dashboard"
                element={<StudentDashboardPage />}
              />
              <Route
                path="/student/subject/:subjectId"
                element={<StudentSubjectPage />}
              />
              <Route
                path="/student/quiz/:quizId"
                element={<StudentQuizPage />}
              />
              <Route
                path="/student/calendar"
                element={<StudentCalendarPage />}
              />
            </Route>
            <Route
              element={<RoleGuard allowedRoles={["admin", "superadmin"]} />}
            >
              <Route element={<RequireCompleteProfile />}>
                <Route
                  path="/superadmin/dashboard"
                  element={<SuperadminDashboardPage />}
                />
                <Route
                  path="/superadmin/accounts"
                  element={<AccountsManagementPage />}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
