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
  Menu,
  X,
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

  // Desktop collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      const updates: { full_name?: string; avatar_url?: string | null } = {};
      if (fullName !== displayName) updates.full_name = fullName;
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar(user.id, avatarFile);
        updates.avatar_url = newAvatarUrl;
      }
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

  // Shared nav links renderer
  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {role === "student" && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70 overflow-hidden">
            {!isCollapsed && "Student Pages"}
          </p>
          <nav className="space-y-2">
            <Link
              to="/student/dashboard"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/student/dashboard")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/student/calendar"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                location.pathname.startsWith("/student/calendar")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <CalendarDays className="h-5 w-5 shrink-0" />
              <span>Calendar</span>
            </Link>
          </nav>
        </div>
      )}

      {role === "teacher" && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70 overflow-hidden">
            {!isCollapsed && "Teacher Pages"}
          </p>
          <nav className="space-y-2">
            <Link
              to="/teacher/dashboard"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/teacher/dashboard")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/teacher/subjects"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                location.pathname.startsWith("/teacher/subjects")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span>Subjects</span>
            </Link>
            <Link
              to="/teacher/calendar"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/teacher/calendar")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <span>Calendar</span>
            </Link>
            <Link
              to="/teacher/quizzes"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/teacher/quizzes")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span>Quizzes & Exams</span>
            </Link>
          </nav>
        </div>
      )}

      {role === "superadmin" && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70 overflow-hidden">
            {!isCollapsed && "Admin Pages"}
          </p>
          <nav className="space-y-2">
            <Link
              to="/superadmin/dashboard"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/superadmin/dashboard")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/superadmin/accounts"
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center gap-3",
                isActive("/superadmin/accounts")
                  ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                  : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
              )}
            >
              <Users className="h-5 w-5 shrink-0" />
              <span>Accounts</span>
            </Link>
          </nav>
        </div>
      )}
    </>
  );

  // Shared user footer renderer
  const UserFooter = ({ onEdit }: { onEdit: () => void }) => (
    <div className="mt-5 border-t border-amber-500/15 pt-4">
      <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 p-3 shadow-inner shadow-amber-500/5 flex items-center gap-3">
        <div
          className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-amber-400/10 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/20"
          onClick={onEdit}
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Pencil className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {role ?? "No role"}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-9 w-9 shrink-0 px-0 text-white",
          )}
        >
          <LogOut className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );

  const ProfileDialog = () => (
    <Dialog
      open={isProfileOpen}
      onOpenChange={(open) => {
        setIsProfileOpen(open);
        if (!open) {
          setFullName(displayName);
          setAvatarPreview(avatarUrl ?? null);
          setAvatarFile(null);
          setSaveSuccess(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm overflow-hidden p-0">
        <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500" />
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
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-amber-400/15 ring-4 ring-amber-500/20 shadow-md">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-amber-600">
                      {initials || "U"}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-md transition hover:bg-amber-600"
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
                <p className="text-xs text-amber-600 font-medium">
                  {avatarFile.name}
                </p>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-amber-500 transition"
              >
                Change photo
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Full Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-stone-900/70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </label>
              <Input
                value={user?.email ?? ""}
                disabled
                className="bg-stone-900/70 text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Role
              </label>
              <div className="flex h-9 items-center rounded-md border border-input bg-stone-900/70 px-3">
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
                : "bg-amber-500 hover:bg-amber-600 text-white",
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
  );

  return (
    <GradientBackground>
      <div className="min-h-screen">
        {/* ── Mobile overlay backdrop ─────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Mobile slide-in drawer ──────────────────────────────────────── */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-amber-500/15 bg-stone-950/95 p-5 shadow-2xl shadow-amber-500/10 backdrop-blur-xl transition-transform duration-300 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo/Logo only-01.png"
                alt="EduVerse"
                className="h-9 w-auto object-contain"
              />
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  EduVerse
                </p>
                <h2 className="text-base font-semibold text-white">
                  Navigation
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-amber-100/80 hover:bg-amber-400/10 hover:text-amber-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>

          <UserFooter
            onEdit={() => {
              setMobileOpen(false);
              setIsProfileOpen(true);
            }}
          />
        </aside>

        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside
          className={cn(
            "fixed left-6 top-6 mt-6 hidden h-[calc(100vh-3rem)] rounded-3xl border border-amber-500/15 bg-stone-950/75 shadow-xl shadow-amber-500/5 backdrop-blur-xl lg:flex lg:flex-col transition-all duration-300 z-50",
            isCollapsed ? "w-20 px-3 p-5" : "w-[18rem] px-5 p-5",
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              "flex",
              isCollapsed
                ? "flex-col items-center gap-2"
                : "items-center justify-between",
            )}
          >
            <div className="flex items-center gap-3">
              <img
                src="/logo/Logo only-01.png"
                alt="EduVerse"
                className={cn(
                  "h-10 w-auto object-contain transition-all duration-300",
                  isCollapsed && "h-8 w-8",
                )}
              />
              {!isCollapsed && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    EduVerse
                  </p>
                  <h2 className="text-lg font-semibold text-white">
                    Navigation
                  </h2>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="rounded-lg p-1 text-amber-100/80 hover:bg-amber-400/10 hover:text-amber-50 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
            {/* Desktop: collapsed sidebar shows icons only */}
            {isCollapsed ? (
              <>
                {role === "student" && (
                  <nav className="space-y-2">
                    <Link
                      to="/student/dashboard"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/student/dashboard")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/student/calendar"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        location.pathname.startsWith("/student/calendar")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <CalendarDays className="h-5 w-5" />
                    </Link>
                  </nav>
                )}
                {role === "teacher" && (
                  <nav className="space-y-2">
                    <Link
                      to="/teacher/dashboard"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/teacher/dashboard")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/teacher/subjects"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        location.pathname.startsWith("/teacher/subjects")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <BookOpen className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/teacher/calendar"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/teacher/calendar")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <Calendar className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/teacher/quizzes"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/teacher/quizzes")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <ClipboardList className="h-5 w-5" />
                    </Link>
                  </nav>
                )}
                {role === "superadmin" && (
                  <nav className="space-y-2">
                    <Link
                      to="/superadmin/dashboard"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/superadmin/dashboard")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                    <Link
                      to="/superadmin/accounts"
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-center",
                        isActive("/superadmin/accounts")
                          ? "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950"
                          : "text-slate-200 hover:bg-amber-400/10 hover:text-amber-50",
                      )}
                    >
                      <Users className="h-5 w-5" />
                    </Link>
                  </nav>
                )}
              </>
            ) : (
              <NavLinks />
            )}
          </div>

          {/* Desktop collapsed user footer */}
          {isCollapsed ? (
            <div className="mt-5 border-t border-amber-500/15 pt-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/15 bg-stone-950/75 p-3">
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-9 w-9 shrink-0 px-0 text-white",
                  )}
                >
                  <LogOut className="h-4 w-4 text-white" />
                </button>
                <div
                  className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-amber-400/10 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/20"
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Pencil className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <UserFooter onEdit={() => setIsProfileOpen(true)} />
          )}

          <ProfileDialog />
        </aside>

        {/* ── Mobile top bar ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-amber-500/15 bg-stone-950/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-stone-900/80 text-amber-100 transition-colors hover:bg-amber-400/10"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-500">
              EduVerse
            </p>
            <h1 className="truncate text-base font-bold tracking-tight gradient-text">
              {title}
            </h1>
          </div>
          {/* Avatar shortcut on mobile */}
          <div
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-amber-400/10 text-xs font-semibold text-amber-100 ring-1 ring-amber-500/20"
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
          </div>
          <ProfileDialog />
        </div>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main
          className={cn(
            "min-h-screen w-full p-4 md:p-6 lg:p-10 transition-all duration-300",
            isCollapsed ? "lg:pl-28" : "lg:pl-80",
          )}
        >
          <div className="mx-auto max-w-6xl">
            {/* Desktop page header (hidden on mobile — top bar handles it) */}
            <header className="mb-8 hidden rounded-2xl border border-amber-500/15 bg-stone-950/75 p-5 shadow-xl shadow-amber-500/5 backdrop-blur-md lg:block">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-500">
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
