import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareText,
  Trophy,
  Users,
} from "lucide-react";
import { AppShell } from "@/layouts/app-shell";
import { supabase } from "@/lib/supabase";

interface ActivityRecord {
  id: string;
  subject_id: string;
  title: string | null;
  instructions: string | null;
  due_date: string | null;
  points: number | null;
  type: string | null;
  file_url: string | null;
}

interface SubmissionFileRecord {
  id: string;
  submission_id: string;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
}

interface SubmissionRecord {
  id: string;
  activity_id: string;
  student_id: string;
  submission_text: string | null;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  status: string | null;
  graded_at: string | null;
  student?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  files?: SubmissionFileRecord[];
}

function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TeacherActivityResponsesPage() {
  const { id: activityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!activityId) return;

    setLoading(true);

    const [
      { data: activityData, error: activityError },
      { data: submissionData, error: submissionError },
    ] = await Promise.all([
      supabase.from("activities").select("*").eq("id", activityId).single(),
      supabase
        .from("activity_submissions")
        .select("*")
        .eq("activity_id", activityId)
        .order("submitted_at", { ascending: false }),
    ]);

    if (activityError || !activityData) {
      setLoading(false);
      return;
    }

    if (submissionError) {
      setLoading(false);
      throw submissionError;
    }

    const studentIds = Array.from(
      new Set((submissionData ?? []).map((row) => row.student_id)),
    );

    const { data: students } = studentIds.length
      ? await supabase
          .from("users")
          .select("id, full_name, email, avatar_url")
          .in("id", studentIds)
      : { data: [] };

    const { data: files } = studentIds.length
      ? await supabase
          .from("activity_submission_files")
          .select("*")
          .in(
            "submission_id",
            (submissionData ?? []).map((row) => row.id),
          )
      : { data: [] };

    const filesBySubmission = (files ?? []).reduce<
      Record<string, SubmissionFileRecord[]>
    >((acc, file) => {
      acc[file.submission_id] = [
        ...(acc[file.submission_id] ?? []),
        file as SubmissionFileRecord,
      ];
      return acc;
    }, {});

    setActivity(activityData as ActivityRecord);
    setSubmissions(
      (submissionData ?? []).map((row) => ({
        ...row,
        student:
          (students ?? []).find((student) => student.id === row.student_id) ??
          null,
        files: filesBySubmission[row.id] ?? [],
      })) as SubmissionRecord[],
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [activityId]);

  const gradedCount = submissions.filter(
    (row) => row.status === "graded",
  ).length;
  const pendingCount = submissions.length - gradedCount;
  const averageScore = useMemo(() => {
    const scored = submissions.filter((row) => typeof row.score === "number");
    if (!scored.length) return 0;
    return Math.round(
      scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length,
    );
  }, [submissions]);

  const handleGrade = async (submission: SubmissionRecord) => {
    if (!activityId) return;

    const scoreInput = (
      document.getElementById(
        `score-${submission.id}`,
      ) as HTMLInputElement | null
    )?.value;
    const feedbackInput =
      (
        document.getElementById(
          `feedback-${submission.id}`,
        ) as HTMLTextAreaElement | null
      )?.value ?? "";

    const score = scoreInput === "" ? null : Number(scoreInput);

    setSavingId(submission.id);
    const { error } = await supabase
      .from("activity_submissions")
      .update({
        score,
        feedback: feedbackInput,
        status: "graded",
        graded_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (!error) {
      await loadData();
    }
    setSavingId(null);
  };

  return (
    <AppShell title="Activity Responses">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            Loading submissions…
          </div>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-500 font-semibold">
              Teacher grading
            </p>
            <h1 className="text-xl font-bold text-white">
              {activity?.title ?? "Activity submissions"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review student work, assign marks, and leave feedback.
            </p>
          </>
        )}
      </div>

      {!loading && activity && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={Users}
                label="Submissions"
                value={submissions.length}
                color="indigo"
              />
              <StatCard
                icon={CheckCircle2}
                label="Graded"
                value={gradedCount}
                color="emerald"
              />
              <StatCard
                icon={Trophy}
                label="Avg. score"
                value={`${averageScore} pts`}
                color="amber"
              />
            </div>

            <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 p-5 shadow-sm backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-50">
                <MessageSquareText className="h-4 w-4 text-amber-500" />
                Student submissions
              </div>

              {submissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-500/15 bg-stone-950/50 p-8 text-center text-sm text-muted-foreground">
                  No students have submitted work for this activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <article
                      key={submission.id}
                      className="rounded-2xl border border-amber-500/15 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm font-semibold text-amber-300">
                            {submission.student?.avatar_url ? (
                              <img
                                src={submission.student.avatar_url}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              initials(submission.student?.full_name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-50">
                              {submission.student?.full_name ??
                                "Unknown student"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.student?.email ?? "No email"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Submitted {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${submission.status === "graded" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}
                        >
                          {submission.status === "graded"
                            ? "Graded"
                            : "Pending"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 rounded-xl border border-amber-500/15 bg-stone-900/60 p-4 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            Student response
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                            {submission.submission_text ||
                              "No written response was provided."}
                          </p>
                        </div>

                        {submission.files && submission.files.length > 0 && (
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                              Attachments
                            </p>
                            <div className="mt-2 space-y-2">
                              {submission.files.map((file) => (
                                <a
                                  key={file.id}
                                  href={file.file_url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between rounded-xl border border-amber-500/15 bg-stone-900/60 px-3 py-2.5 hover:border-amber-400/40 hover:bg-amber-400/10 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                                    <span className="truncate text-sm font-medium text-slate-200">
                                      {file.file_name ?? "Attachment"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatBytes(file.file_size)}
                                    </span>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 rounded-xl border border-amber-500/15 bg-stone-900/60 p-4 md:grid-cols-[120px_1fr]">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Score
                          </label>
                          <input
                            id={`score-${submission.id}`}
                            type="number"
                            min={0}
                            max={activity.points ?? undefined}
                            defaultValue={submission.score ?? ""}
                            className="w-full rounded-xl border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Feedback
                          </label>
                          <textarea
                            id={`feedback-${submission.id}`}
                            rows={4}
                            defaultValue={submission.feedback ?? ""}
                            placeholder="Add clear guidance for the student"
                            className="w-full rounded-xl border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {submission.status === "graded"
                            ? `Graded on ${formatDate(submission.graded_at)}`
                            : "Mark and save when ready."}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleGrade(submission)}
                          disabled={savingId === submission.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
                        >
                          {savingId === submission.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {submission.status === "graded"
                            ? "Update grade"
                            : "Save grade"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 p-5 shadow-sm backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                Activity details
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">
                {activity.title}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {activity.instructions ||
                  "No additional instructions were provided."}
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-400" /> Due{" "}
                  {formatDate(activity.due_date)}
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />{" "}
                  {activity.points ?? 0} points
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-emerald-400" />{" "}
                  {pendingCount} submission{pendingCount === 1 ? "" : "s"} still
                  to grade
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "indigo" | "emerald" | "amber";
}) {
  const tone = {
    indigo: "bg-amber-400/10 text-amber-400",
    emerald: "bg-emerald-400/10 text-emerald-400",
    amber: "bg-amber-400/10 text-amber-400",
  }[color];

  return (
    <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 p-4 shadow-sm backdrop-blur-md">
      <div
        className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
