import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  UserCog,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { fetchTeacherSubjects, type Subject } from "@/lib/api/eduverse";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { profile, role, user } = useAuth();
  const location = useLocation();
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (role !== "teacher" || !user) {
      setTeacherSubjects([]);
      return;
    }

    fetchTeacherSubjects(user.id).then(setTeacherSubjects);
  }, [role, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => location.pathname === path;
  const displayName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email ??
    "Signed in user";
  const avatarUrl =
    profile?.avatar_url ??
    user?.user_metadata?.avatar_url ??
    user?.user_metadata?.picture;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  return (
    <GradientBackground>
      <div className="min-h-screen">
        <aside
          className={`fixed left-6 top-6 mt-6 hidden h-[calc(100vh-3rem)] rounded-3xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-md lg:flex lg:flex-col transition-all duration-300 z-50 ${
            isCollapsed ? "w-20 px-3" : "w-[18rem] px-5"
          }`}
        >
          {/* Logo Section */}
          <div
            className={`flex ${
              isCollapsed
                ? "flex-col items-center gap-2"
                : "items-center justify-between"
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src="/logo/main logo-01.png"
                alt="EduVerse"
                className={`h-10 w-auto object-contain transition-all duration-300 ${
                  isCollapsed ? "h-8 w-8" : "h-10"
                }`}
              />

              {!isCollapsed && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    EduVerse
                  </p>
                  <h2 className="text-lg font-semibold">Navigation</h2>
                </div>
              )}
            </div>

            {/* Button when expanded */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Button when collapsed */}
            {isCollapsed && (
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
            {role === "student" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground overflow-hidden">
                  {!isCollapsed && "Student Pages"}
                </p>
                <nav className="space-y-2">
                  <Link
                    to="/student/dashboard"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/student/dashboard")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                  <Link
                    to="/student/subject"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      location.pathname === "/student/subject"
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <BookOpen className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Subject Details</span>}
                  </Link>
                </nav>
              </div>
            ) : null}

            {role === "teacher" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground overflow-hidden">
                  {!isCollapsed && "Teacher Pages"}
                </p>
                <nav className="space-y-2">
                  <Link
                    to="/teacher/dashboard"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/teacher/dashboard")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                  <Link
                    to="/teacher/subjects"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/teacher/subjects")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <BookOpen className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Add subject</span>}
                  </Link>
                  <Link
                    to="/teacher/calendar"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/teacher/calendar")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Calendar</span>}
                  </Link>
                </nav>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground overflow-hidden">
                    {!isCollapsed && "Subjects"}
                  </p>
                  <nav className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {teacherSubjects.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                        No subjects yet.
                      </p>
                    ) : (
                      teacherSubjects.map((subject) => {
                        const subjectPath = `/teacher/subjects/${subject.id}`;

                        return (
                          <Link
                            key={subject.id}
                            to={subjectPath}
                            className={cn(
                              "block rounded-xl px-4 py-3 text-sm font-medium transition text-center",
                              isActive(subjectPath)
                                ? "bg-indigo-500 text-white"
                                : "text-muted-foreground hover:bg-slate-100",
                            )}
                          >
                            <span className="block truncate">
                              {isCollapsed ? "S" : subject.subject_name}
                            </span>
                            {!isCollapsed && (
                              <span className="mt-1 block truncate text-xs opacity-80">
                                {subject.subject_code}
                              </span>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </nav>
                </div>
              </div>
            ) : null}

            {role === "superadmin" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground overflow-hidden">
                  {!isCollapsed && "Admin Pages"}
                </p>
                <nav className="space-y-2">
                  <Link
                    to="/superadmin/dashboard"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/superadmin/dashboard")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                  <Link
                    to="/superadmin/accounts"
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/superadmin/accounts")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <Users className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Accounts</span>}
                  </Link>
                </nav>
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-white/70 pt-4">
            <div
              className={cn(
                "rounded-2xl bg-slate-50/90 p-3",
                isCollapsed
                  ? "flex flex-col items-center gap-3"
                  : "flex items-center gap-3",
              )}
            >
              {/* Logout button at top when collapsed */}
              {isCollapsed && (
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-9 w-9 shrink-0 px-0",
                  )}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}

              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || "U"
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
                      {role ?? "No role"}
                    </p>
                  </div>

                  {/* Logout button stays on right when expanded */}
                  <button
                    type="button"
                    onClick={signOut}
                    aria-label="Sign out"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-9 w-9 shrink-0 px-0",
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        <main
          className={`min-h-screen w-full p-6 md:p-10 transition-all duration-300 ${
            isCollapsed ? "lg:pl-28" : "lg:pl-80"
          }`}
        >
          <div className="mx-auto max-w-6xl">
            <header className="mb-8 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">
                    EduVerse
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight gradient-text">
                    {title}
                  </h1>
                </div>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
    </GradientBackground>
  );
}
