// quizzes/page.tsx  –  /teacher/quizzes
// Place at: src/pages/teacher/quizzes/page.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ClipboardList,
  Users,
  Clock,
  CalendarDays,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/layouts/app-shell";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchTeacherQuizzes,
  fetchTeacherSubjects,
  createActivityAndQuiz,
  deleteQuizWithActivity,
  type QuizWithActivity,
  type Subject,
  type ActivityType,
} from "@/lib/api/eduverse";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "No due date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function QuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<QuizWithActivity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActivityType>("quiz");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject_id: "",
    due_date: "",
    points: "100",
    instructions: "",
  });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<QuizWithActivity | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchTeacherQuizzes(user.id), fetchTeacherSubjects(user.id)])
      .then(([q, s]) => {
        setQuizzes(q);
        setSubjects(s);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.subject_id || !form.due_date)
      return;
    setCreating(true);
    try {
      const { quiz_id } = await createActivityAndQuiz({
        teacher_id: user.id,
        subject_id: form.subject_id,
        title: form.title,
        instructions: form.instructions,
        due_date: form.due_date,
        points: Number(form.points) || 100,
        activityType: activeTab,
      });
      navigate(`/teacher/quizzes/${quiz_id}/edit`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuizWithActivity(deleteTarget.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const visibleItems = quizzes.filter((q) => q.activity?.type === activeTab);
  const quizCount = quizzes.filter((q) => q.activity?.type === "quiz").length;
  const examCount = quizzes.filter((q) => q.activity?.type === "exam").length;

  return (
    <AppShell title="Quizzes & Exams">
      {/* Page header row */}
      <div className="mb-5 flex items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-amber-500/15 bg-stone-950/60 p-1">
          {(["quiz", "exam"] as ActivityType[]).map((tab) => {
            const count = tab === "quiz" ? quizCount : examCount;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  isActive
                    ? "bg-amber-400 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab === "quiz" ? "Quizzes" : "Exams"}
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold transition-all ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-stone-800 text-stone-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New {activeTab === "exam" ? "Exam" : "Quiz"}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/15 bg-stone-950/50 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
            <ClipboardList className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-white">
              No {activeTab === "exam" ? "exams" : "quizzes"} yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first {activeTab === "exam" ? "exam" : "quiz"} to get
              started.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5 mt-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create {activeTab === "exam" ? "Exam" : "Quiz"}
          </Button>
        </div>
      )}

      {/* Grid */}
      {!loading && visibleItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onEdit={() => navigate(`/teacher/quizzes/${quiz.id}/edit`)}
              onResponses={() =>
                navigate(`/teacher/quizzes/${quiz.id}/responses`)
              }
              onDelete={() => setDeleteTarget(quiz)}
            />
          ))}
        </div>
      )}

      {/* ── Create Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle>
                New {activeTab === "exam" ? "Exam" : "Quiz"}
              </DialogTitle>
              <DialogDescription>
                Set up the basics — you can customize questions after creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {activeTab === "exam" ? "Exam" : "Quiz"} Title
                </label>
                <Input
                  placeholder="e.g. Chapter 3 Quiz"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-slate-950/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subject
                </label>
                <Select
                  value={form.subject_id}
                  onValueChange={(v) => setForm({ ...form, subject_id: v })}
                >
                  <SelectTrigger className="bg-slate-950/70">
                    <SelectValue placeholder="Select subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm({ ...form, due_date: e.target.value })
                    }
                    className="bg-slate-950/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Points
                  </label>
                  <Input
                    type="number"
                    value={form.points}
                    onChange={(e) =>
                      setForm({ ...form, points: e.target.value })
                    }
                    className="bg-slate-950/70"
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Instructions (optional)
                </label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-slate-950/70 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  rows={2}
                  placeholder="Any instructions for students…"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-400 hover:bg-amber-600 text-white min-w-30"
              onClick={handleCreate}
              disabled={
                creating ||
                !form.title.trim() ||
                !form.subject_id ||
                !form.due_date
              }
            >
              {creating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create & Edit →"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-rose-500 to-red-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <DialogTitle>
                Delete{" "}
                {deleteTarget?.activity?.type === "exam" ? "exam" : "quiz"}?
              </DialogTitle>
              <DialogDescription>
                <strong>"{deleteTarget?.activity?.title}"</strong> and all its
                questions, responses, and settings will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="min-w-25 bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// ─── Quiz Card ────────────────────────────────────────────────────────────────

function QuizCard({
  quiz,
  onEdit,
  onResponses,
  onDelete,
}: {
  quiz: QuizWithActivity;
  onEdit: () => void;
  onResponses: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-amber-500/15 bg-stone-950/70 p-5 shadow-lg shadow-amber-500/5 backdrop-blur-md transition-shadow hover:shadow-amber-500/10">
      {/* Subject pill */}
      <span className="mb-3 inline-flex w-fit items-center rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        {quiz.activity?.subject?.subject_name ?? "—"}
      </span>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-3">
        {quiz.activity?.title ?? "Untitled Quiz"}
      </h3>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          {quiz.question_count ?? 0} question
          {(quiz.question_count ?? 0) !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {quiz.attempt_count ?? 0} response
          {(quiz.attempt_count ?? 0) !== 1 ? "s" : ""}
        </span>
        {quiz.time_limit ? (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {quiz.time_limit} min
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(quiz.activity?.due_date ?? null)}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs gap-1.5"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs gap-1.5"
          onClick={onResponses}
        >
          <Users className="h-3.5 w-3.5" />
          Responses
          {(quiz.attempt_count ?? 0) > 0 && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-semibold">
              {quiz.attempt_count}
            </span>
          )}
        </Button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
