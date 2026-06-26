// subject-students-tab.tsx
// Drop this component into SubjectDetailView as a "Students" tab section.
//
// API additions required in eduverse.ts (see subject-students-api.ts):
//   • fetchEnrolledStudents(subjectId)
//   • unenrollStudent(enrollmentId)
//   • EnrolledStudent type

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  UserMinus,
  Users,
  X,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchEnrolledStudents,
  unenrollStudent,
  type EnrolledStudent,
} from "@/lib/api/eduverse";

// ─── Avatar initials helper ───────────────────────────────────────────────────

function avatarInitials(name: string | null) {
  return (name ?? "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ─── Colour cycle for avatar backgrounds ─────────────────────────────────────

const AVATAR_COLORS = [
  "bg-amber-400/20 text-amber-500",
  "bg-violet-400/20 text-violet-400",
  "bg-sky-400/20 text-sky-400",
  "bg-emerald-400/20 text-emerald-500",
  "bg-rose-400/20 text-rose-400",
  "bg-indigo-400/20 text-indigo-400",
];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ─── StudentRow ───────────────────────────────────────────────────────────────

function StudentRow({
  student: enrolled,
  index,
  onUnenroll,
}: {
  student: EnrolledStudent;
  index: number;
  onUnenroll: () => void;
}) {
  const { student } = enrolled;

  const enrolledDate = enrolled.enrolled_at
    ? new Date(enrolled.enrolled_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/10 bg-stone-950/60 px-4 py-3 transition-colors hover:bg-stone-900/60">
      {/* Avatar */}
      {student.avatar_url ? (
        <img
          src={student.avatar_url}
          alt={student.full_name ?? "Student"}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(index)}`}
        >
          {avatarInitials(student.full_name)}
        </div>
      )}

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">
          {student.full_name ?? "Unnamed Student"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {student.email ?? "No email"}
        </p>
      </div>

      {/* Enrolled date — hidden on very small screens */}
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        Enrolled {enrolledDate}
      </span>

      {/* Unenroll button */}
      <button
        type="button"
        onClick={onUnenroll}
        title="Unenroll student"
        className="ml-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      >
        <UserMinus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── StudentsTab (main export) ────────────────────────────────────────────────

export function StudentsTab({ subjectId }: { subjectId: string }) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Unenroll confirm dialog state
  const [confirmUnenroll, setConfirmUnenroll] =
    useState<EnrolledStudent | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [unenrollError, setUnenrollError] = useState("");

  // Load students
  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEnrolledStudents(subjectId);
      setStudents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [subjectId]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (e) =>
        e.student.full_name?.toLowerCase().includes(q) ||
        e.student.email?.toLowerCase().includes(q),
    );
  }, [students, search]);

  // Unenroll handler
  const handleUnenroll = async () => {
    if (!confirmUnenroll) return;
    setUnenrolling(true);
    setUnenrollError("");
    try {
      await unenrollStudent(confirmUnenroll.enrollment_id);
      setStudents((prev) =>
        prev.filter((e) => e.enrollment_id !== confirmUnenroll.enrollment_id),
      );
      setConfirmUnenroll(null);
    } catch (err) {
      setUnenrollError(
        err instanceof Error ? err.message : "Failed to unenroll student.",
      );
    } finally {
      setUnenrolling(false);
    }
  };

  return (
    <>
      {/* ── Header row ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-48 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-stone-950/75 pl-9 pr-8 backdrop-blur-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Count badge */}
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {filtered.length}
              {search ? ` of ${students.length}` : ""} student
              {students.length !== 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>

      {/* ── Loading state ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      )}

      {/* ── Empty — no students enrolled ────────────────────────────────────────── */}
      {!loading && students.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/15 bg-white/5 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
            <GraduationCap className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-white">No students enrolled</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Students can join by entering the class code on their dashboard.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty — search returned nothing ─────────────────────────────────────── */}
      {!loading && students.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/15 bg-white/5 py-16 text-center">
          <Search className="h-7 w-7 text-slate-400" />
          <p className="font-semibold text-slate-200">
            No results for "{search}"
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-sm text-amber-500 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* ── Student list ─────────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((enrolled, i) => (
            <StudentRow
              key={enrolled.enrollment_id}
              student={enrolled}
              index={i}
              onUnenroll={() => {
                setUnenrollError("");
                setConfirmUnenroll(enrolled);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Unenroll confirm dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!confirmUnenroll}
        onOpenChange={(open) => {
          if (!open) setConfirmUnenroll(null);
        }}
      >
        <DialogContent className="sm:max-w-sm overflow-hidden p-0">
          <div className="h-1 bg-rose-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-rose-400" />
                Unenroll Student?
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-slate-200">
                  {confirmUnenroll?.student.full_name ?? "This student"}
                </span>{" "}
                will be removed from this subject. They can re-enroll with the
                class code if needed.
              </DialogDescription>
            </DialogHeader>

            {unenrollError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {unenrollError}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmUnenroll(null)}
              disabled={unenrolling}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUnenroll}
              disabled={unenrolling}
              className="min-w-24 bg-rose-500 text-white hover:bg-rose-600"
            >
              {unenrolling ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Removing…
                </>
              ) : (
                "Unenroll"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
