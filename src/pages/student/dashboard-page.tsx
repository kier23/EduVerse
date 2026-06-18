// pages/student/dashboard-page.tsx
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  X,
  Loader2,
  Hash,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppShell } from "@/layouts/app-shell";
import {
  enrollStudentInSubject,
  fetchStudentSubjects,
  fetchSubjectActivities,
  type Activity,
  type Subject,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLORS = [
  {
    icon: "bg-indigo-100 text-amber-600",
    badge: "bg-amber-400/10  text-amber-600",
    arrow: "group-hover:bg-amber-400/100",
  },
  {
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-400/10  text-violet-600",
    arrow: "group-hover:bg-violet-400/100",
  },
  {
    icon: "bg-sky-100    text-sky-600",
    badge: "bg-sky-50     text-sky-600",
    arrow: "group-hover:bg-sky-500",
  },
  {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-400/10 text-emerald-600",
    arrow: "group-hover:bg-emerald-400/100",
  },
  {
    icon: "bg-amber-100  text-amber-600",
    badge: "bg-amber-50   text-amber-600",
    arrow: "group-hover:bg-amber-500",
  },
  {
    icon: "bg-rose-100   text-rose-600",
    badge: "bg-rose-50    text-rose-600",
    arrow: "group-hover:bg-rose-500",
  },
];

function colorFor(i: number) {
  return COLORS[i % COLORS.length];
}

function initials(name: string | null) {
  return (name ?? "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<
    (Activity & { subject_name: string | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Enroll dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState("");
  const [enrollError, setEnrollError] = useState("");

  const loadSubjects = async () => {
    if (!user) return;
    setLoading(true);
    const rows = await fetchStudentSubjects(user.id);
    setSubjects(rows);

    // Fetch upcoming activities across all subjects
    const activityGroups = await Promise.all(
      rows.map(async (s) => {
        const acts = await fetchSubjectActivities(s.id);
        return acts.map((a) => ({ ...a, subject_name: s.subject_name }));
      }),
    );
    const all = activityGroups.flat().filter((a) => {
      if (!a.due_date) return false;
      return new Date(a.due_date).getTime() >= Date.now();
    });
    all.sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
    );
    setUpcomingActivities(all);
    setLoading(false);
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  const onEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEnrolling(true);
    setEnrollStatus("");
    setEnrollError("");
    try {
      const subject = await enrollStudentInSubject(user.id, classCode);
      setEnrollStatus(`Enrolled in ${subject.subject_name ?? "subject"}!`);
      setClassCode("");
      await loadSubjects();
      setTimeout(() => {
        setEnrollOpen(false);
        setEnrollStatus("");
      }, 1500);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Unable to enroll.");
    } finally {
      setEnrolling(false);
    }
  };

  const filtered = search.trim()
    ? subjects.filter(
        (s) =>
          s.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.subject_code?.toLowerCase().includes(search.toLowerCase()),
      )
    : subjects;

  return (
    <AppShell title="My Dashboard">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-stone-950/75"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`
          )}
        </span>

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => {
              setClassCode("");
              setEnrollError("");
              setEnrollStatus("");
              setEnrollOpen(true);
            }}
            className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" /> Enroll in Subject
          </Button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────────── */}
      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/15 bg-white/50 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
            <BookOpen className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-white">No subjects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask your teacher for a class code to enroll.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEnrollOpen(true)}
            className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5 mt-2"
          >
            <Plus className="h-4 w-4" /> Enroll in Subject
          </Button>
        </div>
      )}

      {/* ── Subject grid ──────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 mb-8">
          {filtered.map((subject) => {
            const c = colorFor(subjects.indexOf(subject));
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => navigate(`/student/subject/${subject.id}`)}
                className="group relative flex flex-col rounded-2xl border border-amber-500/15 bg-stone-950/70 p-5 text-left shadow-lg shadow-indigo-500/5 backdrop-blur-md transition-all hover:shadow-indigo-500/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {/* Icon + code */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold ${c.icon}`}
                  >
                    {initials(subject.subject_name)}
                  </div>
                  {subject.subject_code && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold font-mono tracking-wider ${c.badge}`}
                    >
                      {subject.subject_code}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-amber-700 transition-colors">
                  {subject.subject_name ?? "Untitled Subject"}
                </h3>

                {/* Description */}
                {subject.description ? (
                  <p className="mb-4 flex-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {subject.description}
                  </p>
                ) : (
                  <p className="mb-4 flex-1 text-xs italic text-slate-300">
                    No description
                  </p>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> View subject
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:text-white ${c.arrow}`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Upcoming activities strip ─────────────────────────────────────────── */}
      {!loading && upcomingActivities.length > 0 && (
        <div className="rounded-2xl border border-amber-500/15 bg-stone-950/70 shadow-lg shadow-indigo-500/5 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <CalendarDays className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-amber-50">
              Upcoming Activities
            </h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {upcomingActivities.length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingActivities.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.type === "quiz" ? "bg-amber-400/10" : "bg-violet-400/10"}`}
                >
                  {a.type === "quiz" ? (
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-violet-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-50 truncate">
                    {a.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.subject_name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-slate-200">
                    {new Date(a.due_date!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.points ?? 0} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Enroll Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={enrollOpen}
        onOpenChange={(o) => {
          if (!o) setEnrollOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle>Enroll in a Subject</DialogTitle>
              <DialogDescription>
                Enter the class code your teacher gave you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onEnroll} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Class Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="e.g. CHEM101"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="pl-8 bg-slate-950/70 font-mono tracking-widest"
                    maxLength={12}
                    required
                  />
                </div>
              </div>

              {enrollError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {enrollError}
                </div>
              )}
              {enrollStatus && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-700">
                  ✓ {enrollStatus}
                </div>
              )}

              <DialogFooter className="pt-2 px-0 pb-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnrollOpen(false)}
                  disabled={enrolling}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={enrolling || !classCode.trim()}
                  className="bg-amber-400 hover:bg-amber-600 text-white min-w-24"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Enrolling…
                    </>
                  ) : (
                    "Enroll"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
