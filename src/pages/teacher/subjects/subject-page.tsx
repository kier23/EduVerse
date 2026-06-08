import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Plus,
  X,
  Search,
  Hash,
  AlertCircle,
  ArrowRight,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListItemCard } from "@/components/layout/list-item-card";
import { StatCard } from "@/components/layout/stat-card";
import { AppShell } from "@/layouts/app-shell";
import {
  createActivity,
  createSubject,
  fetchSubjectActivities,
  fetchSubjectMaterials,
  fetchTeacherSubjects,
  type Activity,
  type Material,
  type Subject,
  uploadMaterial,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

// ─── Colour palette cycled per subject card ───────────────────────────────────

const CARD_COLORS = [
  {
    icon: "bg-indigo-100 text-indigo-600",
    badge: "bg-indigo-50 text-indigo-600",
    arrow: "group-hover:bg-indigo-500",
  },
  {
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-50 text-violet-600",
    arrow: "group-hover:bg-violet-500",
  },
  {
    icon: "bg-sky-100    text-sky-600",
    badge: "bg-sky-50    text-sky-600",
    arrow: "group-hover:bg-sky-500",
  },
  {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-600",
    arrow: "group-hover:bg-emerald-500",
  },
  {
    icon: "bg-amber-100  text-amber-600",
    badge: "bg-amber-50  text-amber-600",
    arrow: "group-hover:bg-amber-500",
  },
  {
    icon: "bg-rose-100   text-rose-600",
    badge: "bg-rose-50   text-rose-600",
    arrow: "group-hover:bg-rose-500",
  },
];

function colorFor(i: number) {
  return CARD_COLORS[i % CARD_COLORS.length];
}

function initials(name: string | null) {
  return (name ?? "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

// ─── Root component — decides whether to show the list or detail view ─────────

export function TeacherSubjectPage() {
  const { subjectId } = useParams();

  if (subjectId) {
    return <SubjectDetailView subjectId={subjectId} />;
  }

  return <SubjectListView />;
}

// ─── List view — all subjects with search + create dialog ─────────────────────

function SubjectListView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    subject_name: "",
    subject_code: "",
    description: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchTeacherSubjects(user.id)
      .then(setSubjects)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.subject_name?.toLowerCase().includes(q) ||
        s.subject_code?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  const handleCreate = async () => {
    if (!user || !form.subject_name.trim() || !form.subject_code.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const newSubject = await createSubject({
        teacher_id: user.id,
        subject_name: form.subject_name.trim(),
        subject_code: form.subject_code.trim().toUpperCase(),
        description: form.description.trim(),
      });
      setSubjects((prev) => [newSubject, ...prev]);
      setCreateOpen(false);
      setForm({ subject_name: "", subject_code: "", description: "" });
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create subject.",
      );
    } finally {
      setCreating(false);
    }
  };

  const openCreate = () => {
    setForm({
      subject_name: "",
      subject_code: generateClassCode(),
      description: "",
    });
    setCreateError("");
    setCreateOpen(true);
  };

  return (
    <AppShell title="Subjects">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-white/80 backdrop-blur-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Count */}
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {filtered.length}
              {search ? ` of ${subjects.length}` : ""} subject
              {subjects.length !== 1 ? "s" : ""}
            </>
          )}
        </span>

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-indigo-500 hover:bg-indigo-600 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Subject
          </Button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      )}

      {/* ── Empty — no subjects ───────────────────────────────────────────────── */}
      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/50 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <BookOpen className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">No subjects yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Create your first subject to start managing classes.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-indigo-500 hover:bg-indigo-600 text-white gap-1.5 mt-2"
          >
            <Plus className="h-4 w-4" />
            Create Subject
          </Button>
        </div>
      )}

      {/* ── Empty — no search results ─────────────────────────────────────────── */}
      {!loading && subjects.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
          <Search className="h-8 w-8 text-slate-300" />
          <p className="font-semibold text-slate-700">
            No results for "{search}"
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-sm text-indigo-500 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* ── Subject grid ──────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((subject) => {
            const originalIndex = subjects.indexOf(subject);
            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                colorIndex={originalIndex}
                onClick={() => navigate(`/teacher/subjects/${subject.id}`)}
              />
            );
          })}
        </div>
      )}

      {/* ── Create dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) setCreateOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-indigo-500 via-violet-500 to-sky-500" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle>New Subject</DialogTitle>
              <DialogDescription>
                Fill in the details below. Students join using the class code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subject Name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. General Chemistry"
                  value={form.subject_name}
                  onChange={(e) =>
                    setForm({ ...form, subject_name: e.target.value })
                  }
                  className="bg-slate-50/80"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Class Code <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={form.subject_code}
                      readOnly
                      className="pl-8 bg-slate-50/80 font-mono tracking-widest text-sm font-semibold text-slate-700 cursor-default select-all"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, subject_code: generateClassCode() })
                    }
                    className="shrink-0 text-xs"
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-generated 6-character code. Students use this to enroll.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description (optional)
                </label>
                <Textarea
                  placeholder="Brief description of what this subject covers…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="bg-slate-50/80 resize-none"
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {createError}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
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
              onClick={handleCreate}
              disabled={
                creating ||
                !form.subject_name.trim() ||
                !form.subject_code.trim()
              }
              className="bg-indigo-500 hover:bg-indigo-600 text-white min-w-28"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Subject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// ─── Subject card ─────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  colorIndex,
  onClick,
}: {
  subject: Subject;
  colorIndex: number;
  onClick: () => void;
}) {
  const c = colorFor(colorIndex);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border border-white/60 bg-white/70 p-5 text-left shadow-lg shadow-indigo-500/5 backdrop-blur-md transition-all hover:shadow-indigo-500/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      {/* Icon + code badge */}
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
      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-indigo-700 transition-colors">
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
          <Users className="h-3.5 w-3.5" />
          View details
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:text-white ${c.arrow}`}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function SubjectDetailView({ subjectId }: { subjectId: string }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingSubject, setLoadingSubject] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Activity form state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityInstructions, setActivityInstructions] = useState("");
  const [activityDate, setActivityDate] = useState("");

  // Material form state
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialDragging, setMaterialDragging] = useState(false);

  const [status, setStatus] = useState("");
  const [activeComposer, setActiveComposer] = useState<
    "activity" | "material" | null
  >(null);

  const subject = useMemo(
    () => subjects.find((item) => item.id === subjectId) ?? null,
    [subjectId, subjects],
  );

  const nextDueActivity = useMemo(
    () =>
      activities.find((activity) => {
        if (!activity.due_date) return false;
        return new Date(activity.due_date).getTime() >= Date.now();
      }),
    [activities],
  );

  const loadSubjectPosts = async (id: string) => {
    setLoadingPosts(true);
    const [nextMaterials, nextActivities] = await Promise.all([
      fetchSubjectMaterials(id),
      fetchSubjectActivities(id),
    ]);
    setMaterials(nextMaterials);
    setActivities(nextActivities);
    setLoadingPosts(false);
  };

  useEffect(() => {
    let isMounted = true;
    const loadSubject = async () => {
      if (!user) return;
      setLoadingSubject(true);
      const nextSubjects = await fetchTeacherSubjects(user.id);
      if (!isMounted) return;
      setSubjects(nextSubjects);
      setLoadingSubject(false);
    };
    loadSubject();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    loadSubjectPosts(subjectId);
  }, [subjectId]);

  const onCreateActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!subjectId || !user) return;
    await createActivity({
      subject_id: subjectId,
      teacher_id: user.id,
      title: activityTitle,
      instructions: activityInstructions || "Please complete before due date.",
      type: "assignment",
      due_date: activityDate,
      points: 100,
    });
    setActivityTitle("");
    setActivityInstructions("");
    setActivityDate("");
    setStatus("Activity posted.");
    setActiveComposer(null);
    await loadSubjectPosts(subjectId);
  };

  const onUploadMaterial = async (event: FormEvent) => {
    event.preventDefault();
    if (!subjectId || !user || !materialFile) return;
    await uploadMaterial({
      subject_id: subjectId,
      teacher_id: user.id,
      title: materialTitle,
      description: materialDescription || "Class material upload",
      file: materialFile,
    });
    setMaterialTitle("");
    setMaterialDescription("");
    setMaterialFile(null);
    setStatus("Material uploaded.");
    setActiveComposer(null);
    await loadSubjectPosts(subjectId);
  };

  if (!loadingSubject && subjects.length > 0 && !subject) {
    return <Navigate to="/teacher/subjects" replace />;
  }

  return (
    <AppShell title={subject?.subject_name ?? "Subject Overview"}>
      {/* Back + subject meta */}
      <div className="mb-6">
        <Link
          to="/teacher/subjects"
          className="mb-3 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-indigo-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to subjects
        </Link>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          {subject?.subject_code ?? "Loading subject"}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {subject?.description ?? "Manage posted materials and activities."}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Materials"
          value={loadingPosts ? "..." : materials.length}
          accent="emerald"
        />
        <StatCard
          title="Activities"
          value={loadingPosts ? "..." : activities.length}
          accent="violet"
        />
        <StatCard
          title="Next due"
          value={
            loadingPosts
              ? "..."
              : nextDueActivity?.due_date
                ? nextDueActivity.due_date
                : "None"
          }
          accent="sky"
        />
      </div>

      {/* Status toast */}
      {status ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      ) : null}

      {/* Composer toggle buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeComposer === "activity" ? "default" : "outline"}
          onClick={() =>
            setActiveComposer((c) => (c === "activity" ? null : "activity"))
          }
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Create activity
        </Button>
        <Button
          type="button"
          variant={activeComposer === "material" ? "default" : "outline"}
          onClick={() =>
            setActiveComposer((c) => (c === "material" ? null : "material"))
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          Upload material
        </Button>
      </div>

      {/* ── Activity composer ─────────────────────────────────────────────────── */}
      {activeComposer === "activity" && (
        <div className="mb-6">
          <Card>
            <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-600" />
                    Create Activity
                  </CardTitle>
                  <CardDescription>
                    Post a due task for this subject.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveComposer(null)}
                  className="h-8 w-8 px-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onCreateActivity}>
                <Input
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="Activity title"
                  required
                />
                <Textarea
                  value={activityInstructions}
                  onChange={(e) => setActivityInstructions(e.target.value)}
                  placeholder="Instructions"
                  rows={3}
                />
                <Input
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  type="date"
                  required
                />
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Post activity
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Material composer ─────────────────────────────────────────────────── */}
      {activeComposer === "material" && (
        <div className="mb-6">
          <Card>
            <div className="h-1 bg-linear-to-r from-emerald-500 to-sky-500" />
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Upload Material
                  </CardTitle>
                  <CardDescription>
                    Share a file with students in this subject.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveComposer(null)}
                  className="h-8 w-8 px-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onUploadMaterial}>
                <Input
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="Material title"
                  required
                />
                <Textarea
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                />

                {/* Drag-and-drop file zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setMaterialDragging(true);
                  }}
                  onDragLeave={() => setMaterialDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setMaterialDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) setMaterialFile(file);
                  }}
                  onClick={() =>
                    document.getElementById("material-file-input")?.click()
                  }
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
                    materialDragging
                      ? "border-emerald-400 bg-emerald-50"
                      : materialFile
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
                  }`}
                >
                  <input
                    id="material-file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setMaterialFile(file);
                    }}
                  />
                  {materialFile ? (
                    <>
                      <FileText className="h-7 w-7 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-700">
                        {materialFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(materialFile.size / 1024).toFixed(0)} KB · Click to
                        change
                      </p>
                    </>
                  ) : (
                    <>
                      <FileText className="h-7 w-7 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">
                        Drag & drop a file here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse
                      </p>
                    </>
                  )}
                </div>

                <Button type="submit" disabled={!materialFile}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload material
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Materials + Activities grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Posted Materials
            </CardTitle>
            <CardDescription>
              Resources currently available in this subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPosts ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-xl bg-white/60"
                  />
                ))}
              </div>
            ) : materials.length === 0 ? (
              <p className="rounded-xl border border-dashed border-emerald-200 bg-white/60 p-4 text-sm text-muted-foreground">
                No materials uploaded yet.
              </p>
            ) : (
              materials.map((material) => (
                <ListItemCard key={material.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{material.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {material.description}
                      </p>
                    </div>
                    {material.file_url && (
                      <a
                        href={material.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Open
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-600" />
              Posted Activities
            </CardTitle>
            <CardDescription>
              Assignments and tasks posted for this subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPosts ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-xl bg-white/60"
                  />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-violet-200 bg-white/60 p-4 text-sm text-muted-foreground">
                No activities posted yet.
              </p>
            ) : (
              activities.map((activity) => (
                <ListItemCard key={activity.id}>
                  <p className="font-medium">{activity.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activity.instructions}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                      Due: {activity.due_date ?? "No due date"}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                      {activity.points ?? 0} points
                    </span>
                  </div>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
