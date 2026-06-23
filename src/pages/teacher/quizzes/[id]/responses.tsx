// quizzes/[id]/responses.tsx  –  /teacher/quizzes/:id/responses
// Shows all quiz attempts, summary stats, and per-attempt answer drill-down.
// Manual-grade questions show an inline grading form per answer row.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchQuizById,
  fetchQuizAttempts,
  fetchAttemptAnswers,
  fetchManualGrades,
  saveManualGrade,
  type QuizQuestion,
  type QuizAttempt,
  type QuizAnswer,
  type QuizManualGrades,
} from "@/lib/api/eduverse";

// ─── Constants ────────────────────────────────────────────────────────────────

const MANUAL_GRADE_TYPES = new Set(["essay", "file_upload", "audio_response"]);

function isManual(type: string | null | undefined) {
  return MANUAL_GRADE_TYPES.has(type ?? "");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string | null, submittedAt: string) {
  if (!startedAt) return "—";
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ─── Types ────────────────────────────────────────────────────────────────────

// Per-answer manual grade state tracked locally
type ManualGrade = {
  points: number; // points awarded
  feedback: string; // optional feedback comment
  saved: boolean; // whether this has been persisted
  saving: boolean;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuizResponsesPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<
    Record<string, QuizAnswer[]>
  >({});
  const [loadingAnswers, setLoadingAnswers] = useState<string | null>(null);

  // manualGrades[attemptId][answerId] = ManualGrade
  const [manualGrades, setManualGrades] = useState<
    Record<string, Record<string, ManualGrade>>
  >({});

  useEffect(() => {
    if (!quizId) return;
    Promise.all([
      fetchQuizById(quizId),
      fetchQuizAttempts(quizId),
      fetchManualGrades(quizId),
    ])
      .then(([{ questions: qs }, atts, savedGrades]) => {
        const mappedQs = qs.map((q) => q as QuizQuestion);
        setQuestions(mappedQs);
        setAttempts(atts);

        // Pre-populate manualGrades state from persisted data
        const initialGrades: Record<string, Record<string, ManualGrade>> = {};
        for (const [attemptId, questionGrades] of Object.entries(
          savedGrades as QuizManualGrades,
        )) {
          initialGrades[attemptId] = {};
          for (const [qId, g] of Object.entries(questionGrades)) {
            initialGrades[attemptId][qId] = {
              points: g.points,
              feedback: g.feedback,
              saved: true,
              saving: false,
            };
          }
        }
        setManualGrades(initialGrades);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  // ── Expand / load answers ─────────────────────────────────────────────────

  const toggleExpand = async (attemptId: string) => {
    if (expandedId === attemptId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(attemptId);
    if (!attemptAnswers[attemptId]) {
      setLoadingAnswers(attemptId);
      const answers = await fetchAttemptAnswers(attemptId);
      setAttemptAnswers((prev) => ({ ...prev, [attemptId]: answers }));

      // Ensure every manual question for this attempt has a grade entry
      // (grades from DB are already in state from the initial fetch;
      //  just fill in defaults for any not-yet-graded questions)
      setManualGrades((prev) => {
        const existing = prev[attemptId] ?? {};
        const filled = { ...existing };
        for (const q of questions) {
          if (!isManual(q.question_type)) continue;
          if (!filled[q.id]) {
            filled[q.id] = {
              points: 0,
              feedback: "",
              saved: false,
              saving: false,
            };
          }
        }
        return { ...prev, [attemptId]: filled };
      });

      setLoadingAnswers(null);
    }
  };

  // ── Grade a single answer ─────────────────────────────────────────────────

  // questionId is used as the key (not answerId) because that's what the API stores
  const handleSaveGrade = async (
    attemptId: string,
    questionId: string,
    points: number,
    feedback: string,
    maxPoints: number,
  ) => {
    const clamped = Math.min(Math.max(0, points), maxPoints);

    // Optimistic — show spinner immediately
    setManualGrades((prev) => ({
      ...prev,
      [attemptId]: {
        ...prev[attemptId],
        [questionId]: { points: clamped, feedback, saved: false, saving: true },
      },
    }));

    try {
      const { newTotalScore } = await saveManualGrade({
        quizId: quizId!,
        attemptId,
        questionId,
        points: clamped,
        feedback,
        allQuestions: questions,
      });

      // Update the attempt's displayed score live
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId ? { ...a, score: newTotalScore } : a,
        ),
      );

      // Mark this grade as saved
      setManualGrades((prev) => ({
        ...prev,
        [attemptId]: {
          ...prev[attemptId],
          [questionId]: {
            points: clamped,
            feedback,
            saved: true,
            saving: false,
          },
        },
      }));
    } catch (err) {
      console.error("Failed to save grade", err);
      setManualGrades((prev) => ({
        ...prev,
        [attemptId]: {
          ...prev[attemptId],
          [questionId]: {
            points: clamped,
            feedback,
            saved: false,
            saving: false,
          },
        },
      }));
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.score ?? 0);
  const avgScore =
    totalAttempts > 0
      ? Math.round(scores.reduce((s, n) => s + n, 0) / totalAttempts)
      : 0;
  const highScore = totalAttempts > 0 ? Math.max(...scores) : 0;
  const hasManualQuestions = questions.some((q) => isManual(q.question_type));
  const pendingGrading = attempts.filter((a) => {
    const grades = manualGrades[a.id];
    if (!grades) return false; // not expanded yet — unknown
    return Object.values(grades).some((g) => !g.saved);
  }).length;

  const allAnswers = Object.values(attemptAnswers).flat();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col" style={{ background: "#1a1008" }}>
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-amber-500/15 bg-stone-950/75 px-4 py-3 backdrop-blur-md sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-stone-800 transition-colors shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-amber-500 font-medium">
            Quiz Responses
          </p>
          <h1 className="text-sm font-semibold text-white truncate">
            Student Submissions
          </h1>
        </div>
        {hasManualQuestions && (
          <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-400">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Manual grading required
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/15 px-3 py-1.5 text-xs text-muted-foreground hover:bg-stone-900/70 transition-colors"
        >
          Back to editor
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Total responses"
                  value={totalAttempts}
                  color="amber"
                />
                <StatCard
                  icon={Trophy}
                  label="Average score"
                  value={`${avgScore} pts`}
                  color="emerald"
                />
                <StatCard
                  icon={Trophy}
                  label="High score"
                  value={`${highScore} pts`}
                  color="violet"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Questions"
                  value={questions.length}
                  color="amber"
                />
              </div>

              {/* Grading reminder banner */}
              {hasManualQuestions && (
                <div
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                  style={{ background: "#5b21b615", borderColor: "#8b5cf630" }}
                >
                  <ClipboardCheck className="h-4 w-4 text-violet-400 shrink-0" />
                  <p className="text-sm text-violet-300">
                    This quiz has questions that require manual grading. Expand
                    a student's row to review their response and assign points.
                  </p>
                </div>
              )}

              {/* Responses table */}
              {attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/15 bg-stone-950/50 py-20 text-center">
                  <Users className="h-10 w-10 text-stone-600" />
                  <p className="font-semibold text-stone-300">
                    No responses yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students haven't submitted this quiz.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden">
                  <div className="border-b border-amber-500/15 px-5 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-amber-50">
                      {totalAttempts} submission{totalAttempts !== 1 ? "s" : ""}
                    </h2>
                    {pendingGrading > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                        <ClipboardCheck className="h-3 w-3" />
                        {pendingGrading} pending
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-amber-500/10">
                    {attempts.map((attempt) => {
                      const isExpanded = expandedId === attempt.id;
                      const answers = attemptAnswers[attempt.id] ?? [];
                      const grades = manualGrades[attempt.id] ?? {};
                      const hasUnsaved = Object.values(grades).some(
                        (g) => !g.saved,
                      );
                      const allGraded =
                        hasManualQuestions &&
                        Object.keys(grades).length > 0 &&
                        Object.values(grades).every((g) => g.saved);

                      return (
                        <div key={attempt.id}>
                          {/* Row */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(attempt.id)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-900/60 transition-colors sm:px-5"
                          >
                            {/* Avatar */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-semibold text-amber-300 sm:h-9 sm:w-9">
                              {attempt.student?.avatar_url ? (
                                <img
                                  src={attempt.student.avatar_url}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                initials(attempt.student?.full_name)
                              )}
                            </div>

                            {/* Name + date */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-amber-50 truncate">
                                {attempt.student?.full_name ??
                                  "Unknown student"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(attempt.submitted_at)}
                              </p>
                            </div>

                            {/* Duration */}
                            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(
                                attempt.started_at,
                                attempt.submitted_at,
                              )}
                            </div>

                            {/* Score + grading status */}
                            <div className="flex flex-col items-end gap-1">
                              <div
                                className={cn(
                                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold sm:px-2.5",
                                  (attempt.score ?? 0) > 0
                                    ? "bg-emerald-400/10 text-emerald-400"
                                    : "bg-stone-800/80 text-stone-400",
                                )}
                              >
                                <Trophy className="h-3 w-3" />
                                {attempt.score ?? 0} pts
                              </div>
                              {hasManualQuestions && (
                                <span
                                  className={cn(
                                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    allGraded
                                      ? "bg-emerald-400/10 text-emerald-400"
                                      : hasUnsaved
                                        ? "bg-amber-400/10 text-amber-400"
                                        : "bg-violet-400/10 text-violet-400",
                                  )}
                                >
                                  <ClipboardCheck className="h-2.5 w-2.5" />
                                  {allGraded
                                    ? "Graded"
                                    : hasUnsaved
                                      ? "In progress"
                                      : "Needs grading"}
                                </span>
                              )}
                            </div>

                            {/* Expand chevron */}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
                            )}
                          </button>

                          {/* Expanded answers */}
                          {isExpanded && (
                            <div className="border-t border-amber-500/15 bg-stone-950/60 px-5 py-4 space-y-3">
                              {loadingAnswers === attempt.id ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading answers…
                                </div>
                              ) : answers.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  No answers recorded for this attempt.
                                </p>
                              ) : (
                                questions.map((q, qi) => {
                                  const answer = answers.find(
                                    (a) => a.question_id === q.id,
                                  );
                                  // grades keyed by questionId
                                  const grade = grades[q.id];
                                  return (
                                    <AnswerRow
                                      key={q.id}
                                      index={qi + 1}
                                      question={q}
                                      answer={answer ?? null}
                                      grade={grade}
                                      onGradeChange={(points, feedback) => {
                                        setManualGrades((prev) => ({
                                          ...prev,
                                          [attempt.id]: {
                                            ...prev[attempt.id],
                                            [q.id]: {
                                              points,
                                              feedback,
                                              saved: false,
                                              saving: false,
                                            },
                                          },
                                        }));
                                      }}
                                      onSaveGrade={(points, feedback) => {
                                        handleSaveGrade(
                                          attempt.id,
                                          q.id,
                                          points,
                                          feedback,
                                          q.points ?? 0,
                                        );
                                      }}
                                    />
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-question breakdown */}
              {allAnswers.length > 0 && questions.length > 0 && (
                <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden">
                  <div className="border-b border-amber-500/15 px-5 py-3">
                    <h2 className="text-sm font-semibold text-amber-50">
                      Question breakdown
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Based on viewed responses
                    </p>
                  </div>
                  <div className="divide-y divide-amber-500/10">
                    {questions.map((q, qi) => {
                      const qAnswers = allAnswers.filter(
                        (a) => a.question_id === q.id,
                      );
                      const hasAnswer = qAnswers.filter(
                        (a) => (a.answer_text ?? "").trim().length > 0,
                      ).length;
                      const pct =
                        qAnswers.length > 0
                          ? Math.round((hasAnswer / qAnswers.length) * 100)
                          : 0;

                      return (
                        <div
                          key={q.id}
                          className="px-5 py-3 flex items-center gap-4"
                        >
                          <span className="text-xs font-semibold text-muted-foreground w-6 shrink-0">
                            Q{qi + 1}
                          </span>
                          <p className="flex-1 text-xs text-stone-200 truncate">
                            {q.question ?? "Untitled question"}
                          </p>
                          {isManual(q.question_type) && (
                            <span className="shrink-0 rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                              Manual
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-stone-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "amber" | "emerald" | "violet";
}) {
  const colorMap = {
    amber: "bg-amber-400/10 text-amber-400",
    emerald: "bg-emerald-400/10 text-emerald-400",
    violet: "bg-violet-400/10 text-violet-400",
  };

  return (
    <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 p-4 shadow-sm backdrop-blur-md">
      <div
        className={cn(
          "mb-2 flex h-8 w-8 items-center justify-center rounded-lg",
          colorMap[color],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ─── AnswerRow ────────────────────────────────────────────────────────────────

function AnswerRow({
  index,
  question,
  answer,
  grade,
  onGradeChange,
  onSaveGrade,
}: {
  index: number;
  question: QuizQuestion;
  answer: QuizAnswer | null;
  grade: ManualGrade | undefined;
  onGradeChange: (points: number, feedback: string) => void;
  onSaveGrade: (points: number, feedback: string) => void;
}) {
  const hasAnswer = answer && (answer.answer_text ?? answer.uploaded_file_url);
  const needsGrading = isManual(question.question_type);
  const maxPts = question.points ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-stone-950/75 overflow-hidden transition-all",
        needsGrading && grade?.saved
          ? "border-emerald-500/25"
          : needsGrading
            ? "border-violet-500/25"
            : "border-amber-500/15",
      )}
    >
      {/* Question header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-amber-500/10">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[10px] font-semibold text-amber-300">
          {index}
        </div>
        <p className="flex-1 text-xs font-medium text-stone-200 truncate">
          {question.question ?? "Untitled question"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {maxPts} pt{maxPts !== 1 ? "s" : ""}
          </span>
          {needsGrading && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                grade?.saved
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-violet-400/10 text-violet-400",
              )}
            >
              {grade?.saved ? (
                <>
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Graded
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-2.5 w-2.5" />
                  To grade
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Student's answer */}
      <div className="px-3 py-2.5 space-y-1.5">
        {hasAnswer ? (
          <>
            {answer.answer_text && (
              <p className="text-xs text-stone-300 bg-stone-900/60 border border-amber-500/10 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {answer.answer_text}
              </p>
            )}
            {answer.uploaded_file_url && (
              <a
                href={answer.uploaded_file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:underline transition-colors"
              >
                View uploaded file →
              </a>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No answer submitted
          </p>
        )}
      </div>

      {/* Manual grading form */}
      {needsGrading && (
        <GradeForm
          maxPoints={maxPts}
          grade={grade}
          onGradeChange={onGradeChange}
          onSave={onSaveGrade}
        />
      )}
    </div>
  );
}

// ─── GradeForm ────────────────────────────────────────────────────────────────

function GradeForm({
  maxPoints,
  grade,
  onGradeChange,
  onSave,
}: {
  maxPoints: number;
  grade: ManualGrade | undefined;
  onGradeChange: (points: number, feedback: string) => void;
  onSave: (points: number, feedback: string) => void;
}) {
  const pts = grade?.points ?? 0;
  const feedback = grade?.feedback ?? "";
  const saved = grade?.saved ?? false;
  const saving = grade?.saving ?? false;

  // Star quick-grade buttons (0 / 25% / 50% / 75% / 100%)
  const presets = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxPoints));

  return (
    <div className="border-t border-violet-500/15 bg-violet-950/10 px-3 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">
          Teacher Grade
        </span>
        {saved && (
          <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      {/* Points input + quick presets */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-20 shrink-0">
            Points awarded
          </label>
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="number"
              min={0}
              max={maxPoints}
              value={pts}
              onChange={(e) =>
                onGradeChange(
                  Math.min(Math.max(0, Number(e.target.value)), maxPoints),
                  feedback,
                )
              }
              className="w-20 rounded-lg border border-violet-500/25 bg-stone-900/70 px-2.5 py-1.5 text-sm font-semibold text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
            />
            <span className="text-xs text-muted-foreground">
              / {maxPoints} pts
            </span>
          </div>
        </div>

        {/* Quick preset buttons */}
        {maxPoints > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground mr-0.5">
              Quick:
            </span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onGradeChange(p, feedback)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-all",
                  pts === p
                    ? "bg-violet-500/30 border-violet-400/50 text-violet-200"
                    : "bg-stone-800/60 border-stone-700/50 text-stone-400 hover:border-violet-500/30 hover:text-violet-300",
                )}
              >
                {p}
                {p === 0
                  ? ""
                  : p === maxPoints
                    ? " ✓"
                    : ` (${Math.round((p / maxPoints) * 100)}%)`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback textarea */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          Feedback <span className="text-stone-600">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={feedback}
          onChange={(e) => onGradeChange(pts, e.target.value)}
          placeholder="Add a comment for the student…"
          className="w-full resize-none rounded-lg border border-violet-500/20 bg-stone-900/70 px-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(pts, feedback)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white transition-all",
          saved && !saving
            ? "bg-emerald-600/70 hover:bg-emerald-600"
            : "bg-violet-600 hover:bg-violet-500",
          saving && "opacity-60 cursor-not-allowed",
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Update Grade
          </>
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            Save Grade
          </>
        )}
      </button>
    </div>
  );
}
