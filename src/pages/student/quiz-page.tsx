// pages/student/quiz-page.tsx
// Full quiz-taking experience for students.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Music,
  RotateCcw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchQuizById,
  fetchQuizSettings,
  type Quiz,
  type QuizQuestion,
  type QuizQuestionMedia,
  type QuizSettings,
} from "@/lib/api/eduverse";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedQuestion = QuizQuestion & {
  choices: {
    id: string;
    choice_text: string | null;
    is_correct: boolean | null;
    image_url?: string | null;
  }[];
  media: QuizQuestionMedia[];
};

type Answer = string | string[] | Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function answerToText(answer: Answer | undefined): string {
  if (!answer) return "";
  if (Array.isArray(answer)) return answer.join(", ");
  if (typeof answer === "object")
    return Object.entries(answer)
      .map(([k, v]) => `${k} → ${v}`)
      .join("; ");
  return String(answer);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<EnrichedQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({});
  const [activityTitle, setActivityTitle] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Quiz state
  const [phase, setPhase] = useState<"welcome" | "quiz" | "submitted">(
    "welcome",
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<string>("");

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!quizId) return;
    Promise.all([fetchQuizById(quizId), fetchQuizSettings(quizId)])
      .then(async ([{ quiz: q, questions: qs }, s]) => {
        setQuiz(q);
        setQuestions(qs as EnrichedQuestion[]);
        setSettings(s);

        // Fetch activity title + subjectId for back navigation
        if (q.activity_id) {
          const { data: act } = await supabase
            .from("activities")
            .select("title, subject_id")
            .eq("id", q.activity_id)
            .single();
          if (act) {
            setActivityTitle(act.title ?? "Quiz");
            setSubjectId(act.subject_id ?? "");
          }
        }
      })
      .catch(() => setError("Failed to load quiz."))
      .finally(() => setLoading(false));
  }, [quizId]);

  // ── Timer ─────────────────────────────────────────────────────────────────

  const startTimer = (minutes: number) => {
    setSecondsLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Start ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!quizId || !user) return;

    // Check attempt limit before starting
    if (quiz?.attempts_allowed) {
      const { count } = await supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", quizId)
        .eq("student_id", user.id);

      if (count !== null && count >= quiz.attempts_allowed) {
        setError(
          "You have reached the maximum number of attempts for this quiz.",
        );
        return;
      }
    }

    startedAt.current = new Date().toISOString();
    setPhase("quiz");
    if (quiz?.time_limit) startTimer(quiz.time_limit);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!quizId || !user || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Create attempt row
      const { data: attempt, error: aErr } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quizId,
          student_id: user.id,
          started_at: startedAt.current,
          submitted_at: new Date().toISOString(),
          score: 0, // calculated below
        })
        .select()
        .single();

      if (aErr || !attempt) throw aErr;

      // Insert answers
      const answerRows = questions.map((q) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        answer_text: answerToText(answers[q.id]),
        uploaded_file_url: null,
      }));

      if (answerRows.length > 0) {
        await supabase.from("quiz_answers").insert(answerRows);
      }

      // Auto-grade: multiple_choice, true_false, fill_blank
      let totalScore = 0;
      for (const q of questions) {
        const ans = answers[q.id];
        const pts = q.points ?? 0;
        const content = (q.question_content ?? {}) as Record<string, unknown>;

        if (
          q.question_type === "multiple_choice" ||
          q.question_type === "image_choice"
        ) {
          const correct = q.choices.find((c) => c.is_correct)?.choice_text;
          if (ans === correct) totalScore += pts;
        } else if (q.question_type === "multiple_select") {
          const correctSet = new Set(
            q.choices.filter((c) => c.is_correct).map((c) => c.choice_text),
          );
          const selected = Array.isArray(ans) ? ans : [];
          const isCorrect =
            selected.length === correctSet.size &&
            selected.every((s) => correctSet.has(s));
          if (isCorrect) totalScore += pts;
        } else if (q.question_type === "true_false") {
          const correct = String(content.correct_answer);
          if (String(ans) === correct) totalScore += pts;
        } else if (q.question_type === "short_answer") {
          const sample = String(content.sample_answer ?? "")
            .toLowerCase()
            .trim();
          if (sample && String(ans).toLowerCase().trim() === sample)
            totalScore += pts;
        }
      }

      await supabase
        .from("quiz_attempts")
        .update({ score: totalScore })
        .eq("id", attempt.id);
      setScore(totalScore);
      setPhase("submitted");
    } catch {
      setError("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const color = settings.primaryColor ?? "#6366f1";
  const current = questions[currentIndex];
  const total = questions.length;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="font-semibold text-slate-200">
          {error || "Quiz not found."}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-amber-500 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  // ── Welcome screen ────────────────────────────────────────────────────────

  if (phase === "welcome") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: "#f8fafc" }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-amber-500/15 bg-stone-950/75 backdrop-blur-sm">
          <button
            type="button"
            onClick={() =>
              navigate(
                subjectId ? `/student/subject/${subjectId}` : (-1 as never),
              )
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-medium text-slate-200 truncate">
            {activityTitle}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6">
            {/* Banner */}
            {quiz.banner_url && (
              <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                <img
                  src={quiz.banner_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, transparent, ${color}55)`,
                  }}
                />
              </div>
            )}

            {/* Card */}
            <div
              className="rounded-2xl border bg-white p-8 shadow-sm"
              style={{ borderColor: color + "30" }}
            >
              <div
                className="h-1 w-16 rounded-full mb-6"
                style={{ background: color }}
              />
              <h1 className="text-2xl font-bold text-white mb-2">
                {activityTitle}
              </h1>

              {quiz.welcome_message && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {quiz.welcome_message}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-300">
                  <FileText className="h-3.5 w-3.5" />
                  {total} question{total !== 1 ? "s" : ""}
                </span>
                {quiz.time_limit && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    <Clock className="h-3.5 w-3.5" />
                    {quiz.time_limit} min time limit
                  </span>
                )}
                {quiz.attempts_allowed && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-300">
                    <RotateCcw className="h-3.5 w-3.5" />
                    {quiz.attempts_allowed} attempt
                    {quiz.attempts_allowed !== 1 ? "s" : ""} allowed
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: color }}
              >
                Start Quiz →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted screen ──────────────────────────────────────────────────────

  if (phase === "submitted") {
    const totalPts = questions.reduce((s, q) => s + (q.points ?? 0), 0);
    const pct = totalPts > 0 ? Math.round(((score ?? 0) / totalPts) * 100) : 0;

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center p-6"
        style={{ background: "#f8fafc" }}
      >
        <div className="w-full max-w-lg space-y-5">
          <div
            className="rounded-2xl border bg-white p-8 shadow-sm text-center"
            style={{ borderColor: color + "30" }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: color + "15" }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Submitted!
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your answers have been recorded.
            </p>

            {/* Score ring */}
            <div
              className="mx-auto mb-6 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4"
              style={{ borderColor: color }}
            >
              <p className="text-2xl font-bold" style={{ color }}>
                {score ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">/ {totalPts} pts</p>
            </div>

            <div className="flex gap-3 flex-wrap justify-center mb-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-300">
                {pct}% score
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ background: color }}
              >
                {pct >= 75
                  ? "Passed ✓"
                  : pct >= 50
                    ? "Fair"
                    : "Needs improvement"}
              </span>
            </div>
          </div>

          {/* Answer summary */}
          <div
            className="rounded-2xl border bg-white shadow-sm overflow-hidden"
            style={{ borderColor: color + "20" }}
          >
            <div className="border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-semibold text-amber-50">
                Your Answers
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {questions.map((q, i) => (
                <div key={q.id} className="px-5 py-3 flex gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 line-clamp-1">
                      {q.question}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {answerToText(answers[q.id]) || (
                        <span className="italic">No answer</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                subjectId
                  ? `/student/subject/${subjectId}`
                  : "/student/dashboard",
              )
            }
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: color }}
          >
            Back to Subject
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#f8fafc" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b border-white/20 backdrop-blur-md"
        style={{ background: color }}
      >
        <p className="text-sm font-semibold text-white truncate flex-1">
          {activityTitle}
        </p>
        <span className="text-xs text-white/80">
          {currentIndex + 1} / {total}
        </span>
        {secondsLeft !== null && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
              secondsLeft < 60
                ? "bg-red-500 text-white"
                : "bg-white/20 text-white",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {settings.showProgress !== false && (
        <div className="h-1 bg-slate-200">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      )}

      {/* Question */}
      <div className="flex flex-1 justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-5">
          {current && (
            <QuestionRenderer
              question={current}
              index={currentIndex}
              color={color}
              answer={answers[current.id]}
              onAnswer={(v) =>
                setAnswers((prev) => ({ ...prev, [current.id]: v }))
              }
              showCard={settings.questionCard !== false}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="rounded-xl border border-amber-500/15 bg-white px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-950/70 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {currentIndex < total - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: color }}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: color }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Quiz
                  </>
                )}
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  i === currentIndex ? "w-5" : "",
                  answers[q.id] ? "opacity-100" : "opacity-30",
                )}
                style={{
                  background:
                    i === currentIndex || answers[q.id] ? color : "#94a3b8",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question renderer ────────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  index,
  color,
  answer,
  onAnswer,
  showCard,
}: {
  question: EnrichedQuestion;
  index: number;
  color: string;
  answer: Answer | undefined;
  onAnswer: (v: Answer) => void;
  showCard: boolean;
}) {
  const content = (question.question_content ?? {}) as Record<string, unknown>;
  const type = question.question_type ?? "short_answer";

  const wrap = (children: React.ReactNode) => (
    <div
      className={cn(
        "space-y-5",
        showCard && "rounded-2xl border bg-white p-6 shadow-sm",
      )}
      style={showCard ? { borderColor: color + "25" } : {}}
    >
      {/* Question header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color }}
          >
            Question {index + 1}
          </span>
          <span className="text-[10px] text-muted-foreground">
            · {question.points ?? 1} pt{(question.points ?? 1) !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-base font-semibold text-white leading-snug">
          {question.question || (
            <span className="italic text-slate-400">No question text</span>
          )}
        </p>
        {question.media?.map((m) => (
          <MediaBlock key={m.id} media={m} />
        ))}
      </div>
      {children}
    </div>
  );

  // Multiple choice / image choice
  if (type === "multiple_choice" || type === "image_choice") {
    return wrap(
      <div className="space-y-2">
        {question.choices.map((c, i) => {
          const selected = answer === c.choice_text;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(c.choice_text ?? "")}
              className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all"
              style={
                selected
                  ? { borderColor: color, background: color + "10", color }
                  : {
                      borderColor: "#e2e8f0",
                      background: "white",
                      color: "#374151",
                    }
              }
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all"
                style={
                  selected
                    ? { borderColor: color, background: color, color: "white" }
                    : { borderColor: "#cbd5e1" }
                }
              >
                {selected ? "✓" : String.fromCharCode(65 + i)}
              </span>
              {c.image_url && (
                <img
                  src={c.image_url}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              {c.choice_text || (
                <span className="italic text-slate-400">Empty option</span>
              )}
            </button>
          );
        })}
      </div>,
    );
  }

  // Multiple select
  if (type === "multiple_select") {
    const selected: string[] = Array.isArray(answer)
      ? (answer as string[])
      : [];
    const toggle = (text: string) => {
      const next = selected.includes(text)
        ? selected.filter((x) => x !== text)
        : [...selected, text];
      onAnswer(next);
    };
    return wrap(
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        {question.choices.map((c, i) => {
          const checked = selected.includes(c.choice_text ?? "");
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(c.choice_text ?? "")}
              className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all"
              style={
                checked
                  ? { borderColor: color, background: color + "10", color }
                  : {
                      borderColor: "#e2e8f0",
                      background: "white",
                      color: "#374151",
                    }
              }
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold transition-all"
                style={
                  checked
                    ? { borderColor: color, background: color, color: "white" }
                    : { borderColor: "#cbd5e1" }
                }
              >
                {checked ? "✓" : ""}
              </span>
              {c.choice_text}
            </button>
          );
        })}
      </div>,
    );
  }

  // True / False
  if (type === "true_false") {
    return wrap(
      <div className="flex gap-3">
        {(["true", "false"] as const).map((val) => {
          const selected = answer === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onAnswer(val)}
              className="flex-1 rounded-xl border-2 py-4 text-sm font-semibold capitalize transition-all"
              style={
                selected
                  ? { background: color, borderColor: color, color: "white" }
                  : {
                      borderColor: "#e2e8f0",
                      background: "white",
                      color: "#64748b",
                    }
              }
            >
              {val === "true" ? "✓ True" : "✗ False"}
            </button>
          );
        })}
      </div>,
    );
  }

  // Short answer
  if (type === "short_answer") {
    return wrap(
      <input
        type="text"
        placeholder="Type your answer here…"
        value={(answer as string) ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        className="w-full rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
        style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
      />,
    );
  }

  // Essay
  if (type === "essay") {
    return wrap(
      <textarea
        placeholder="Write your response here…"
        value={(answer as string) ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        rows={5}
        className="w-full resize-none rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
        style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
      />,
    );
  }

  // Fill in the blank
  if (type === "fill_blank") {
    const template = (content.template as string) ?? "";
    const parts = template.split(/\[blank\]/i);
    const ansArr: string[] = Array.isArray(answer)
      ? (answer as string[])
      : Array(parts.length - 1).fill("");
    const updateBlank = (i: number, v: string) => {
      const next = [...ansArr];
      next[i] = v;
      onAnswer(next);
    };
    return wrap(
      <div className="text-sm text-amber-50 leading-loose">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={ansArr[i] ?? ""}
                onChange={(e) => updateBlank(i, e.target.value)}
                className="inline-block w-32 mx-1 rounded-lg border-b-2 border-slate-300 bg-transparent px-2 py-0.5 text-sm text-center focus:outline-none transition-colors"
                style={{
                  borderColor: ansArr[i] ? color : undefined,
                  color: ansArr[i] ? color : undefined,
                }}
                placeholder="______"
              />
            )}
          </span>
        ))}
      </div>,
    );
  }

  // Ordering
  if (type === "ordering") {
    const items = (content.items as string[]) ?? [];
    const current = Array.isArray(answer)
      ? (answer as string[])
      : [...items].sort(() => 0.5 - Math.random());
    if (!answer) onAnswer(current);
    const move = (from: number, to: number) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onAnswer(next);
    };
    return wrap(
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Arrange in the correct order.
        </p>
        {current.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-white px-4 py-3"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: color }}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-slate-200">{item}</span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => i > 0 && move(i, i - 1)}
                disabled={i === 0}
                className="text-slate-300 hover:text-slate-400 disabled:opacity-20 text-xs"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => i < current.length - 1 && move(i, i + 1)}
                disabled={i === current.length - 1}
                className="text-slate-300 hover:text-slate-400 disabled:opacity-20 text-xs"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>,
    );
  }

  // Matching
  if (type === "matching") {
    const pairs = (content.pairs as { left: string; right: string }[]) ?? [];
    const matchAnswer = (
      typeof answer === "object" && !Array.isArray(answer) ? answer : {}
    ) as Record<string, string>;
    return wrap(
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Match each item on the left to its pair.
        </p>
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
              {pair.left}
            </div>
            <span className="text-slate-300 text-xs">→</span>
            <select
              value={matchAnswer[pair.left] ?? ""}
              onChange={(e) =>
                onAnswer({ ...matchAnswer, [pair.left]: e.target.value })
              }
              className="flex-1 rounded-xl border border-amber-500/15 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
            >
              <option value="">Select…</option>
              {pairs.map((p, pi) => (
                <option key={pi} value={p.right}>
                  {p.right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>,
    );
  }

  // File upload
  if (type === "file_upload") {
    const accepted = (content.accepted_types as string[]) ?? [];
    const maxMb = (content.max_size_mb as number) ?? 10;
    return wrap(
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-500/15 bg-slate-950/70 py-10">
        <FileText className="h-8 w-8 text-slate-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">Upload your file</p>
          <p className="text-xs text-muted-foreground mt-1">
            {accepted.length > 0
              ? accepted.map((t) => `.${t}`).join(", ")
              : "Any file"}{" "}
            · Max {maxMb}MB
          </p>
        </div>
        <input
          type="file"
          className="text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          style={{ "--file-bg": color } as React.CSSProperties}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAnswer(f.name);
          }}
        />
      </div>,
    );
  }

  // Audio response
  if (type === "audio_response") {
    const maxSec = (content.max_duration_sec as number) ?? 60;
    const instructions = (content.instructions as string) ?? "";
    return wrap(
      <div className="space-y-3">
        {instructions && (
          <p className="text-sm text-slate-300 bg-slate-950/70 rounded-xl px-4 py-3">
            {instructions}
          </p>
        )}
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-500/15 bg-slate-950/70 py-8">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: color + "15" }}
          >
            <Music className="h-7 w-7" style={{ color }} />
          </div>
          <p className="text-sm font-medium text-slate-300">
            Tap to record your response
          </p>
          <p className="text-xs text-muted-foreground">Max {maxSec}s</p>
        </div>
      </div>,
    );
  }

  return wrap(
    <p className="text-sm text-muted-foreground italic">
      Question type not supported.
    </p>,
  );
}

// ─── Media block ──────────────────────────────────────────────────────────────

function MediaBlock({ media }: { media: QuizQuestionMedia }) {
  const url = media.file_url;
  const type = media.file_type ?? "";
  if (!url) return null;
  if (type.startsWith("image/"))
    return (
      <img
        src={url}
        alt=""
        className="rounded-xl max-h-64 w-full object-cover border border-slate-100"
      />
    );
  if (type.startsWith("audio/"))
    return <audio controls src={url} className="w-full rounded-xl" />;
  if (type.startsWith("video/"))
    return <video controls src={url} className="w-full rounded-xl max-h-64" />;
  if (type === "application/pdf")
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <FileText className="h-4 w-4" /> View attached PDF
      </a>
    );
  return null;
}
