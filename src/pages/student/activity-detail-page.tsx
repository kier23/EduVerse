// pages/student/activity-detail-page.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trophy,
  Upload,
  X,
  AlertCircle,
  Send,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

/* ─── types ──────────────────────────────────────────────────────────────── */
interface Activity {
  id: string;
  subject_id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
  points: number | null;
  type: string;
  file_url: string | null;
}

interface SubmissionFile {
  id: string;
  submission_id: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
}

interface Submission {
  id: string;
  activity_id: string;
  student_id: string;
  submission_text: string | null;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  status: string | null;
  files: SubmissionFile[];
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function formatDate(d: string | null) {
  if (!d) return "No due date";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPast(d: string | null) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── component ──────────────────────────────────────────────────────────── */
export function ActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // form state
  const [submissionText, setSubmissionText] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* fetch activity + existing submission */
  useEffect(() => {
    if (!activityId || !user) return;
    setLoading(true);

    (async () => {
      // fetch activity
      const { data: act, error: actErr } = await supabase
        .from("activities")
        .select("*")
        .eq("id", activityId)
        .single();

      if (actErr || !act) {
        setLoading(false);
        return;
      }
      setActivity(act as Activity);

      // fetch existing submission
      const { data: sub } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("activity_id", activityId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (sub) {
        const { data: files } = await supabase
          .from("activity_submission_files")
          .select("*")
          .eq("submission_id", sub.id)
          .order("uploaded_at", { ascending: true });

        setSubmission({ ...sub, files: files ?? [] } as Submission);
        setSubmissionText(sub.submission_text ?? "");
      }

      setLoading(false);
    })();
  }, [activityId, user]);

  /* file staging */
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setStagedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...picked.filter((f) => !existing.has(f.name))];
    });
    e.target.value = "";
  };

  const removeStaged = (name: string) =>
    setStagedFiles((prev) => prev.filter((f) => f.name !== name));

  /* submit */
  const handleSubmit = async () => {
    if (!user || !activity) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let submissionId = submission?.id ?? null;

      if (!submissionId) {
        // create submission row
        const { data: newSub, error: subErr } = await supabase
          .from("activity_submissions")
          .insert({
            activity_id: activity.id,
            student_id: user.id,
            submission_text: submissionText || null,
            status: "submitted",
          })
          .select()
          .single();

        if (subErr || !newSub)
          throw new Error(subErr?.message ?? "Failed to create submission");
        submissionId = newSub.id;
      } else {
        // update existing submission text
        const { error: updErr } = await supabase
          .from("activity_submissions")
          .update({
            submission_text: submissionText || null,
            submitted_at: new Date().toISOString(),
            status: "submitted",
          })
          .eq("id", submissionId);

        if (updErr) throw new Error(updErr.message);
      }

      if (!submissionId) throw new Error("Submission ID is missing");

      // upload staged files
      const uploadedFiles: Omit<SubmissionFile, "id" | "uploaded_at">[] = [];

      for (const file of stagedFiles) {
        const path = `activity-submissions/${activity.id}/${user.id}/${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("activity-submissions")
          .upload(path, file, { upsert: true });

        if (upErr)
          throw new Error(`Upload failed for ${file.name}: ${upErr.message}`);

        const { data: urlData } = supabase.storage
          .from("activity-submissions")
          .getPublicUrl(path);

        uploadedFiles.push({
          submission_id: submissionId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        });
      }

      if (uploadedFiles.length > 0) {
        const { error: fileErr } = await supabase
          .from("activity_submission_files")
          .insert(uploadedFiles);

        if (fileErr) throw new Error(fileErr.message);
      }

      // refresh submission state
      const { data: updatedSub } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      const { data: allFiles } = await supabase
        .from("activity_submission_files")
        .select("*")
        .eq("submission_id", submissionId)
        .order("uploaded_at", { ascending: true });

      setSubmission({ ...updatedSub, files: allFiles ?? [] } as Submission);
      setStagedFiles([]);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── render ─────────────────────────────────────────────────────────────── */
  const overdue = isPast(activity?.due_date ?? null);
  const isSubmitted = !!submission;
  const isGraded = submission?.status === "graded";
  const showSubmissionForm = !isSubmitted;

  if (!loading && !activity) {
    return (
      <AppShell title="Activity">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertCircle className="h-10 w-10 text-red-300" />
          <p className="font-semibold text-slate-200">Activity not found</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-amber-500 hover:underline"
          >
            Go back
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={activity?.title ?? "Activity"}>
      {/* Back */}
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
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 capitalize">
                {activity?.type}
              </span>
              {isGraded && (
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Graded
                </span>
              )}
              {isSubmitted && !isGraded && (
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                  Submitted
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white">{activity?.title}</h1>
          </>
        )}
      </div>

      {!loading && activity && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* On mobile: status sidebar shows first */}
          <div className="space-y-4 xl:order-2 xl:col-start-2">
            {/* Status card */}
            <Card>
              <div
                className={`h-1 ${isGraded ? "bg-linear-to-r from-emerald-500 to-teal-500" : isSubmitted ? "bg-linear-to-r from-sky-500 to-indigo-500" : "bg-linear-to-r from-slate-300 to-slate-400"}`}
              />
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isGraded ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-700">
                      Graded
                    </span>
                  </div>
                ) : isSubmitted ? (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sky-500" />
                    <span className="text-sm font-semibold text-sky-700">
                      Awaiting grade
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-600">
                      Not submitted
                    </span>
                  </div>
                )}

                {isSubmitted && (
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDate(submission!.submitted_at)}
                  </p>
                )}

                {/* Score */}
                {isGraded &&
                  submission?.score !== null &&
                  submission?.score !== undefined && (
                    <div className="rounded-xl bg-emerald-400/10 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">
                        Score
                      </p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {submission.score}
                        <span className="ml-1 text-sm font-medium text-emerald-500">
                          / {activity.points ?? "?"}
                        </span>
                      </p>
                    </div>
                  )}

                {/* Feedback */}
                {submission?.feedback && (
                  <div className="rounded-xl border border-stone-100 bg-stone-950/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Teacher Feedback
                    </p>
                    <p className="text-sm text-slate-200">
                      {submission.feedback}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attached files */}
            {isSubmitted && submission.files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Submitted Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {submission.files.map((f) => (
                    <a
                      key={f.id}
                      href={f.file_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-stone-900/70 px-3 py-2.5 hover:border-indigo-200 hover:bg-amber-400/10 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10">
                          <FileText className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-200 group-hover:text-amber-700">
                            {f.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(f.file_size)}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-400" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Left — details + submission form */}
          <div className="space-y-6 xl:order-1 xl:col-start-1">
            {/* Activity info */}
            <Card>
              <div className="h-1 bg-linear-to-r from-violet-500 to-purple-500" />
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                      overdue
                        ? "bg-red-50 text-red-600"
                        : "bg-violet-400/10 text-violet-700"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Due {formatDate(activity.due_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-700">
                    <Trophy className="h-3.5 w-3.5" />
                    {activity.points ?? 0} pts
                  </span>
                </div>

                {activity.instructions && (
                  <div className="rounded-xl border border-stone-100 bg-stone-950/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Instructions
                    </p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {activity.instructions}
                    </p>
                  </div>
                )}

                {activity.file_url && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Attached File
                    </p>
                    <a
                      href={activity.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-400/10/60 px-4 py-3 transition-colors hover:bg-violet-100/60 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                          <FileText className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-200 group-hover:text-violet-700">
                            {decodeURIComponent(
                              activity.file_url
                                .split("/")
                                .pop()
                                ?.split("?")[0] ?? "Attached file",
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click to open
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-violet-300 group-hover:text-violet-600 transition-colors" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission form */}
            {showSubmissionForm && (
              <Card>
                <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
                <CardHeader>
                  <CardTitle className="text-base">Your Submission</CardTitle>
                  <CardDescription>
                    Add your answer and/or attach files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Text area */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Answer / Notes
                    </label>
                    <textarea
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      rows={5}
                      placeholder="Type your response here…"
                      className="w-full rounded-xl border border-amber-500/15 bg-stone-900/70 px-4 py-3 text-sm text-amber-50 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                    />
                  </div>

                  {/* File drop zone */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Attach Files
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-amber-500/15 bg-slate-950/60 px-4 py-6 text-center transition-colors hover:border-amber-300/30 hover:bg-amber-400/10"
                    >
                      <Upload className="mx-auto h-6 w-6 text-slate-400 mb-2" />
                      <p className="text-sm font-medium text-slate-300">
                        Click to select files
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        PDF, Word, images, or any file type
                      </p>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </div>

                  {/* Staged files */}
                  {stagedFiles.length > 0 && (
                    <ul className="space-y-2">
                      {stagedFiles.map((f) => (
                        <li
                          key={f.name}
                          className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-900/70 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Paperclip className="h-4 w-4 shrink-0 text-indigo-400" />
                            <span className="truncate text-sm font-medium text-slate-200">
                              {f.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatBytes(f.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStaged(f.name)}
                            className="ml-2 rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {submitError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (!submissionText.trim() && stagedFiles.length === 0)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {isSubmitted ? "Update Submission" : "Submit"}
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Read-only submission summary after submission */}
            {isSubmitted && (
              <Card>
                <div
                  className={`h-1 ${isGraded ? "bg-linear-to-r from-emerald-500 to-sky-500" : "bg-linear-to-r from-sky-500 to-indigo-500"}`}
                />
                <CardHeader>
                  <CardTitle className="text-base">Your Submission</CardTitle>
                  <CardDescription>
                    {isGraded
                      ? "This submission has been graded and is locked."
                      : "Your response has been submitted and is waiting for teacher review."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {submission?.submission_text && (
                    <div className="rounded-xl border border-stone-100 bg-stone-950/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Your answer
                      </p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">
                        {submission.submission_text}
                      </p>
                    </div>
                  )}
                  {submission?.files?.length ? (
                    <div className="rounded-xl border border-stone-100 bg-stone-950/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Submitted files
                      </p>
                      <div className="space-y-2">
                        {submission.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.file_url ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-stone-900/70 px-3 py-2.5 hover:border-indigo-200 hover:bg-amber-400/10 transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                              <span className="truncate text-sm font-medium text-slate-200 group-hover:text-amber-700">
                                {file.file_name ?? "Attachment"}
                              </span>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
