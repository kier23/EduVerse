import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Role icon components ──────────────────────────────────────────────────────

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-amber-500/70 stroke-none">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-none stroke-amber-500/70"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 16v5" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-none stroke-amber-500/70"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

// ── Role data ─────────────────────────────────────────────────────────────────

const roles = [
  {
    label: "Admin",
    Icon: AdminIcon,
    desc: "Oversee accounts and system analytics",
  },
  {
    label: "Teacher",
    Icon: TeacherIcon,
    desc: "Manage subjects, activities, and schedules",
  },
  {
    label: "Student",
    Icon: StudentIcon,
    desc: "View materials, to-dos, and quiz scores",
  },
];

// ── Desktop Sidebar ───────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col items-center border-r border-white/10 bg-black/40 px-5 py-8 backdrop-blur-md">
      {/* Logo */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-600/40 shadow-[0_0_24px_rgba(245,158,11,0.18)] overflow-hidden">
        <img
          src="/logo/school-logo.png"
          alt="Barotuan National High School Logo"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mb-4 h-px w-full bg-white/10" />

      {/* Role info cards */}
      <div className="flex w-full flex-col gap-3">
        {roles.map(({ label, Icon, desc }) => (
          <Card
            key={label}
            className="border-amber-900/30 bg-white/[0.05] backdrop-blur-sm"
          >
            <CardContent className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                <Icon />
              </span>
              <div>
                <p className="mb-0.5 text-sm font-semibold text-amber-400">
                  {label}
                </p>
                <p className="text-xs leading-relaxed text-stone-400">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-auto text-center text-[10px] leading-5 text-stone-500">
        EduVerse LMS
        <br />© 2025 BNHS
      </p>
    </aside>
  );
}

// ── Mobile top bar (logo + school name) ──────────────────────────────────────

function MobileTopBar() {
  return (
    <div className="flex lg:hidden items-center gap-3 border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-600/40 shadow-[0_0_12px_rgba(245,158,11,0.18)] overflow-hidden">
        <img
          src="/logo/school-logo.png"
          alt="Barotuan National High School Logo"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wider text-stone-100 leading-tight">
          Barotuan National High School
        </p>
        <p className="truncate text-[10px] uppercase tracking-wider text-stone-400 leading-tight">
          Learning Management System
        </p>
      </div>
    </div>
  );
}

// ── Header bar ────────────────────────────────────────────────────────────────

function HeaderBar() {
  return (
    <header className="hidden lg:flex shrink-0 items-center gap-4 border-b border-white/10 bg-black/30 px-10 py-5 backdrop-blur-md">
      <div>
        <h1 className="text-[25px] font-bold uppercase tracking-widest text-stone-100 leading-tight">
          Barotuan National High School
        </h1>
        <h1 className="text-[25px] font-bold uppercase tracking-widest text-stone-100 leading-tight">
          Learning Management System for Senior High School
        </h1>
      </div>
    </header>
  );
}

// ── Mobile role cards strip ───────────────────────────────────────────────────

function MobileRoleCards() {
  return (
    <div className="flex lg:hidden w-full flex-col gap-2 px-4 pb-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Who uses EduVerse
      </p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map(({ label, Icon, desc }) => (
          <Card
            key={label}
            className="border-amber-900/30 bg-white/[0.05] backdrop-blur-sm"
          >
            <CardContent className="flex flex-col items-center gap-1.5 p-3 text-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
                <Icon />
              </span>
              <p className="text-xs font-semibold text-amber-400">{label}</p>
              <p className="text-[10px] leading-relaxed text-stone-400">
                {desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] leading-5 text-stone-600">
        EduVerse LMS · © 2025 BNHS
      </p>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div
      className="relative flex h-screen w-full overflow-hidden"
      style={{
        backgroundImage: "url('/school-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content layer */}
      <div className="relative flex h-full w-full">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Right panel (full width on mobile) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar — visible only on < lg */}
          <MobileTopBar />

          {/* Desktop header bar — visible only on lg+ */}
          <HeaderBar />

          {/* Hero */}
          <main className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center overflow-y-auto">
            <h1 className="mb-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              Manage Classes, Materials, and Activities{" "}
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                in One Place
              </span>
            </h1>

            <p className="mb-8 max-w-sm text-sm leading-relaxed text-stone-300 sm:max-w-xl sm:text-base">
              A teacher/student portal for analytics, subject management,
              scheduling, and learning progress.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className={cn(buttonVariants({ size: "lg" }), "min-w-[120px]")}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-w-[120px]",
                )}
              >
                Sign up
              </Link>
            </div>
          </main>

          {/* Mobile role cards — below hero, hidden on lg+ */}
          <MobileRoleCards />
        </div>
      </div>
    </div>
  );
}
