// quizzes/[id]/responses.tsx  –  /teacher/quizzes/:id/responses
// Shows all quiz attempts, summary stats, and per-attempt answer drill-down.

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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchQuizById,
  fetchQuizAttempts,
  fetchAttemptAnswers,
  type QuizQuestion,
  type QuizAttempt,
  type QuizAnswer,
} from "@/lib/api/eduverse";

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

  useEffect(() => {
    if (!quizId) return;
    Promise.all([fetchQuizById(quizId), fetchQuizAttempts(quizId)])
      .then(([{ questions: qs }, atts]) => {
        setQuestions(qs.map((q) => q as QuizQuestion));
        setAttempts(atts);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

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
      setLoadingAnswers(null);
    }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalAttempts = attempts.length;
  const scores = attempts.map((a) => a.score ?? 0);
  const avgScore =
    totalAttempts > 0
      ? Math.round(scores.reduce((s, n) => s + n, 0) / totalAttempts)
      : 0;
  const highScore = totalAttempts > 0 ? Math.max(...scores) : 0;

  // ── Per-question correct % ────────────────────────────────────────────────
  const allAnswers = Object.values(attemptAnswers).flat();

  return (
    <div className="flex h-screen flex-col bg-slate-950/70">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-amber-500/15 bg-stone-950/75 px-4 py-3 backdrop-blur-md sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-800 transition-colors shrink-0"
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
        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/edit`)}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/15 px-3 py-1.5 text-xs text-muted-foreground hover:bg-slate-950/70 transition-colors"
        >
          Back to editor
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Total responses"
                  value={totalAttempts}
                  color="indigo"
                />
                <StatCard
                  icon={Trophy}
                  label="Average score"
                  value={`${avgScore}pts`}
                  color="amber"
                />
                <StatCard
                  icon={Trophy}
                  label="High score"
                  value={`${highScore}pts`}
                  color="emerald"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Questions"
                  value={questions.length}
                  color="violet"
                />
              </div>

              {/* Responses table */}
              {attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/15 bg-white/50 py-20 text-center">
                  <Users className="h-10 w-10 text-slate-200" />
                  <p className="font-semibold text-slate-200">
                    No responses yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students haven't submitted this quiz.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-3">
                    <h2 className="text-sm font-semibold text-amber-50">
                      {totalAttempts} submission{totalAttempts !== 1 ? "s" : ""}
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {attempts.map((attempt) => {
                      const isExpanded = expandedId === attempt.id;
                      const answers = attemptAnswers[attempt.id] ?? [];

                      return (
                        <div key={attempt.id}>
                          {/* Row */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(attempt.id)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-950/70 transition-colors sm:px-5"
                          >
                            {/* Avatar */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-amber-600 sm:h-9 sm:w-9">
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

                            {/* Score badge */}
                            <div
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold sm:px-2.5",
                                (attempt.score ?? 0) > 0
                                  ? "bg-emerald-400/10 text-emerald-700"
                                  : "bg-slate-100 text-slate-400",
                              )}
                            >
                              <Trophy className="h-3 w-3" />
                              {attempt.score ?? 0} pts
                            </div>

                            {/* Expand chevron */}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </button>

                          {/* Expanded answers */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-950/60 px-5 py-4 space-y-3">
                              {loadingAnswers === attempt.id ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
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
                                  return (
                                    <AnswerRow
                                      key={q.id}
                                      index={qi + 1}
                                      question={q}
                                      answer={answer ?? null}
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

              {/* Per-question breakdown (only if we've loaded at least one attempt's answers) */}
              {allAnswers.length > 0 && questions.length > 0 && (
                <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-3">
                    <h2 className="text-sm font-semibold text-amber-50">
                      Question breakdown
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Based on viewed responses
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
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
                          <p className="flex-1 text-xs text-slate-200 truncate">
                            {q.question ?? "Untitled question"}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-400 transition-all"
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "indigo" | "amber" | "emerald" | "violet";
}) {
  const colorMap = {
    indigo: "bg-amber-400/10 text-amber-600",
    amber: "bg-amber-50  text-amber-600",
    emerald: "bg-emerald-400/10 text-emerald-600",
    violet: "bg-violet-400/10 text-violet-600",
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

function AnswerRow({
  index,
  question,
  answer,
}: {
  index: number;
  question: QuizQuestion;
  answer: QuizAnswer | null;
}) {
  const hasAnswer = answer && (answer.answer_text ?? answer.uploaded_file_url);

  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/15 bg-white p-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-400 mt-0.5">
        {index}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-medium text-slate-200 truncate">
          {question.question ?? "Untitled question"}
        </p>
        {hasAnswer ? (
          <>
            {answer.answer_text && (
              <p className="text-xs text-slate-300 bg-slate-950/70 rounded px-2 py-1 wrap-break-words">
                {answer.answer_text}
              </p>
            )}
            {answer.uploaded_file_url && (
              <a
                href={answer.uploaded_file_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-500 hover:underline"
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
    </div>
  );
}
