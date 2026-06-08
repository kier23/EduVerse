import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  Pencil,
  Camera,
  Check,
  Loader2,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GradientBackground } from "@/components/layout/gradient-background";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/api/eduverse";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { profile, role, user, refreshProfile } = useAuth();
  const location = useLocation();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => location.pathname === path;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  // Edit profile state
  const [fullName, setFullName] = useState(displayName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    avatarUrl ?? null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(displayName);
    setAvatarPreview(avatarUrl ?? null);
  }, [displayName, avatarUrl]);
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const updates: {
        full_name?: string;
        avatar_url?: string | null;
      } = {};

      // Only update name if it changed
      if (fullName !== displayName) {
        updates.full_name = fullName;
      }

      // Only update avatar if a new file was selected
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar(user.id, avatarFile);
        updates.avatar_url = newAvatarUrl;
      }

      // Nothing changed
      if (Object.keys(updates).length === 0) {
        setIsProfileOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      console.log("Updated row:", data);

      if (error) throw error;

      setSaveSuccess(true);
      setAvatarFile(null);

      await refreshProfile();

      setTimeout(() => {
        setSaveSuccess(false);
        setIsProfileOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

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
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/student/dashboard")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </Link>
                  <Link
                    to="/student/calendar"
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      location.pathname.startsWith("/student/calendar")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <CalendarDays className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Calendar</span>}
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
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
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
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      location.pathname.startsWith("/teacher/subjects")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <BookOpen className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Subjects</span>}
                  </Link>
                  <Link
                    to="/teacher/calendar"
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/teacher/calendar")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                  >
                    <Calendar className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Calendar</span>}
                  </Link>
                  <Link
                    to="/teacher/quizzes"
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                      isActive("/teacher/quizzes")
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:bg-slate-100",
                    )}
                    title="Quizzes"
                  >
                    <ClipboardList className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Quizzes & Exams</span>}
                  </Link>
                </nav>
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
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
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
                      "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
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

              <div
                className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
                onClick={() => setIsProfileOpen(true)}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || "U"
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Pencil className="h-4 w-4 text-white" />
                </div>
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
          <Dialog
            open={isProfileOpen}
            onOpenChange={(open) => {
              setIsProfileOpen(open);
              if (!open) {
                // Reset unsaved changes on close
                setFullName(displayName);
                setAvatarPreview(avatarUrl ?? null);
                setAvatarFile(null);
                setSaveSuccess(false);
              }
            }}
          >
            <DialogContent className="sm:max-w-sm overflow-hidden p-0">
              {/* Top gradient bar */}
              <div className="h-1 bg-linear-to-r from-indigo-500 via-violet-500 to-sky-500" />

              <div className="p-5">
                <DialogHeader className="mb-5">
                  <DialogTitle className="text-base font-semibold">
                    Edit Profile
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your name and profile photo
                  </p>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Avatar upload */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-indigo-100 ring-4 ring-white shadow-md">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-indigo-600">
                            {initials || "U"}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md transition hover:bg-indigo-600"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    {avatarFile && (
                      <p className="text-xs text-indigo-600 font-medium">
                        {avatarFile.name}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-indigo-500 transition"
                    >
                      Change photo
                    </button>
                  </div>

                  {/* Full name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Full Name
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-slate-50/80"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Email
                    </label>
                    <Input
                      value={user?.email ?? ""}
                      disabled
                      className="bg-slate-50/80 text-muted-foreground"
                    />
                  </div>

                  {/* Role (read-only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Role
                    </label>
                    <div className="flex h-9 items-center rounded-md border border-input bg-slate-50/80 px-3">
                      <span className="capitalize text-sm text-muted-foreground">
                        {role ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-5 pb-5 pt-0 border-t-0 bg-transparent mx-0 mb-0 rounded-none">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={isSaving || saveSuccess}
                  className={cn(
                    "min-w-27.5 transition-all",
                    saveSuccess
                      ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                      : "bg-indigo-500 hover:bg-indigo-600 text-white",
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Saved!
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
