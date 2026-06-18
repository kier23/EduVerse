// pages/student/subject-page.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  Clock,
  Trophy,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Play,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
import { AppShell } from "@/layouts/app-shell";
import {
  fetchSubjectActivities,
  fetchSubjectMaterials,
  fetchStudentSubjects,
  type Activity,
  type Material,
  type Subject,
} from "@/lib/api/eduverse";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

function formatDate(d: string | null) {
  if (!d) return "No due date";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPast(d: string | null) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

export function StudentSubjectPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  // quizId per activity_id — fetched once
  const [quizIds, setQuizIds] = useState<Record<string, string>>({});
  // Previous attempt scores keyed by quiz_id
  const [attemptScores, setAttemptScores] = useState<
    Record<string, number | null>
  >({});
  // NEW ↓
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>(
    {},
  );
  const [quizAttemptsAllowed, setQuizAttemptsAllowed] = useState<
    Record<string, number | null>
  >({});

  useEffect(() => {
    if (!subjectId || !user) return;
    setLoading(true);

    Promise.all([
      fetchStudentSubjects(user.id),
      fetchSubjectMaterials(subjectId),
      fetchSubjectActivities(subjectId),
    ])
      .then(async ([subjects, mats, acts]) => {
        const found = subjects.find((s) => s.id === subjectId) ?? null;
        setSubject(found);
        setMaterials(mats);
        setActivities(acts);

        // Fetch quiz rows for all quiz-type activities
        const quizActivities = acts.filter((a) => a.type === "quiz");
        if (quizActivities.length > 0) {
          const { data: quizRows } = await supabase
            .from("quizzes")
            .select("id, activity_id, attempts_allowed")
            .in(
              "activity_id",
              quizActivities.map((a) => a.id),
            );

          const idMap: Record<string, string> = {};
          (quizRows ?? []).forEach((q: { id: string; activity_id: string }) => {
            idMap[q.activity_id] = q.id;
          });
          setQuizIds(idMap);

          const allowedMap: Record<string, number | null> = {};
          (quizRows ?? []).forEach(
            (q: {
              id: string;
              activity_id: string;
              attempts_allowed: number | null;
            }) => {
              allowedMap[q.id] = q.attempts_allowed;
            },
          );
          setQuizAttemptsAllowed(allowedMap);

          // Fetch student's best attempt per quiz
          const quizIdList = Object.values(idMap);
          if (quizIdList.length > 0) {
            const { data: attempts } = await supabase
              .from("quiz_attempts")
              .select("quiz_id, score")
              .eq("student_id", user.id)
              .in("quiz_id", quizIdList)
              .order("score", { ascending: false });

            const scoreMap: Record<string, number | null> = {};
            const countMap: Record<string, number> = {};
            (attempts ?? []).forEach(
              (a: { quiz_id: string; score: number | null }) => {
                if (!(a.quiz_id in scoreMap)) scoreMap[a.quiz_id] = a.score;
                countMap[a.quiz_id] = (countMap[a.quiz_id] ?? 0) + 1;
              },
            );
            setAttemptScores(scoreMap);
            setAttemptCounts(countMap);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [subjectId, user]);

  const quizActivities = useMemo(
    () => activities.filter((a) => a.type === "quiz"),
    [activities],
  );
  const otherActivities = useMemo(
    () => activities.filter((a) => a.type !== "quiz"),
    [activities],
  );

  if (!loading && !subject) {
    return (
      <AppShell title="Subject">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertCircle className="h-10 w-10 text-red-300" />
          <p className="font-semibold text-slate-200">Subject not found</p>
          <Link
            to="/student/dashboard"
            className="text-sm text-amber-500 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={subject?.subject_name ?? "Subject"}>
      {/* Back + header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/student/dashboard")}
          className="mb-3 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </button>

        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
              {subject?.subject_code}
            </p>
            <h1 className="mt-1 text-xl font-bold text-white">
              {subject?.subject_name}
            </h1>
            {subject?.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            {
              label: "Materials",
              value: materials.length,
              color: "text-emerald-600",
              bg: "bg-emerald-400/10",
            },
            {
              label: "Activities",
              value: otherActivities.length,
              color: "text-violet-600",
              bg: "bg-violet-400/10",
            },
            {
              label: "Quizzes",
              value: quizActivities.length,
              color: "text-amber-600",
              bg: "bg-amber-400/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border border-amber-500/15 ${s.bg} p-4 backdrop-blur-sm`}
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Materials */}
        <Card>
          <div className="h-1 bg-linear-to-r from-emerald-500 to-sky-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Materials
            </CardTitle>
            <CardDescription>Resources shared by your teacher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </>
            ) : materials.length === 0 ? (
              <p className="rounded-xl border border-dashed border-emerald-200 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                No materials uploaded yet.
              </p>
            ) : (
              materials.map((m) => (
                <ListItemCard key={m.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
                        <FileText className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {m.file_url && (
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-600 hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>

        {/* Other activities */}
        <Card>
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-600" />
              Activities
            </CardTitle>
            <CardDescription>
              Assignments and tasks from your teacher.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </>
            ) : otherActivities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-violet-200 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                No activities posted yet.
              </p>
            ) : (
              otherActivities.map((a) => (
                <ListItemCard
                  key={a.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => navigate(`/student/activity/${a.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{a.title}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  {a.instructions && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {a.instructions}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${isPast(a.due_date) ? "bg-red-50 text-red-600" : "bg-violet-400/10 text-violet-700"}`}
                    >
                      Due: {formatDate(a.due_date)}
                    </span>
                    <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-700">
                      {a.points ?? 0} pts
                    </span>
                    {a.file_url && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-400/10 px-2.5 py-1 text-violet-600">
                        <FileText className="h-3 w-3" />
                        Attachment
                      </span>
                    )}
                  </div>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quizzes — full width */}
        {(loading || quizActivities.length > 0) && (
          <div className="xl:col-span-2">
            <Card>
              <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                  Quizzes & Exams
                </CardTitle>
                <CardDescription>
                  Click a quiz to start or review your attempt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="h-24 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quizActivities.map((a) => {
                      const quizId = quizIds[a.id];
                      const score =
                        quizId !== undefined
                          ? attemptScores[quizId]
                          : undefined;
                      const attempted =
                        quizId !== undefined && quizId in attemptScores;
                      const overdue = isPast(a.due_date);
                      const attemptsAllowed = quizId
                        ? quizAttemptsAllowed[quizId]
                        : null;
                      const attemptCount = quizId
                        ? (attemptCounts[quizId] ?? 0)
                        : 0;
                      const isLimitReached =
                        attemptsAllowed != null &&
                        attemptCount >= attemptsAllowed;

                      return (
                        <button
                          key={a.id}
                          type="button"
                          disabled={!quizId || isLimitReached}
                          onClick={() =>
                            quizId && navigate(`/student/quiz/${quizId}`)
                          }
                          className="group flex flex-col rounded-2xl border border-amber-500/15 bg-stone-950/70 p-4 text-left shadow-sm backdrop-blur-md transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${attempted ? "bg-emerald-400/10" : "bg-amber-400/10"}`}
                            >
                              {attempted ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Play className="h-5 w-5 text-amber-500" />
                              )}
                            </div>
                            {attempted &&
                              score !== null &&
                              score !== undefined && (
                                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  {score} pts
                                </span>
                              )}
                            {!quizId && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-muted-foreground">
                                Not set up
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-white group-hover:text-amber-700 transition-colors line-clamp-2 mb-2">
                            {a.title}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs mt-auto">
                            <span
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${overdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-300"}`}
                            >
                              <Clock className="h-3 w-3" />
                              {formatDate(a.due_date)}
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-600">
                              <Trophy className="h-3 w-3" />
                              {a.points ?? 0} pts
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span className="text-xs text-muted-foreground">
                              {isLimitReached
                                ? "No attempts remaining"
                                : attempted
                                  ? "Review / Retake"
                                  : "Start quiz"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
