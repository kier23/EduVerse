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
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
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
  deleteActivity,
  deleteMaterial,
  fetchSubjectActivities,
  fetchSubjectMaterials,
  fetchTeacherSubjects,
  updateActivityRecord,
  updateMaterial,
  type Activity,
  type Material,
  type Subject,
  uploadMaterial,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { StudentsTab } from "@/pages/teacher/subjects/subject-students-tab";

// ─── Colour palette cycled per subject card ───────────────────────────────────

const CARD_COLORS = [
  {
    icon: "bg-indigo-100 text-amber-600",
    badge: "bg-amber-400/10 text-amber-600",
    arrow: "group-hover:bg-amber-400/100",
  },
  {
    icon: "bg-violet-100 text-violet-600",
    badge: "bg-violet-400/10 text-violet-600",
    arrow: "group-hover:bg-violet-400/100",
  },
  {
    icon: "bg-sky-100    text-sky-600",
    badge: "bg-sky-50    text-sky-600",
    arrow: "group-hover:bg-sky-500",
  },
  {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-400/10 text-emerald-600",
    arrow: "group-hover:bg-emerald-400/100",
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

// ─── Drag-and-drop file zone (shared) ────────────────────────────────────────

function FileDropZone({
  id,
  file,
  onFile,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  id: string;
  file: File | null;
  onFile: (f: File) => void;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => document.getElementById(id)?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors ${
        dragging
          ? "border-emerald-400 bg-emerald-400/10"
          : file
            ? "border-emerald-300 bg-emerald-400/10/60"
            : "border-amber-500/15 bg-slate-950/70 hover:border-emerald-300 hover:bg-emerald-400/10"
      }`}
    >
      <input
        id={id}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {file ? (
        <>
          <FileText className="h-7 w-7 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB · Click to change
          </p>
        </>
      ) : (
        <>
          <FileText className="h-7 w-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-300">
            Drag & drop a file here
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function TeacherSubjectPage() {
  const { subjectId } = useParams();
  if (subjectId) return <SubjectDetailView subjectId={subjectId} />;
  return <SubjectListView />;
}

// ─── List view ────────────────────────────────────────────────────────────────

function SubjectListView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 bg-stone-950/75 backdrop-blur-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-stone-800">
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
            className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Subject
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/15 bg-white/50 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
            <BookOpen className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-white">No subjects yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Create your first subject to start managing classes.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-amber-400 hover:bg-amber-600 text-white gap-1.5 mt-2"
          >
            <Plus className="h-4 w-4" />
            Create Subject
          </Button>
        </div>
      )}

      {!loading && subjects.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-500/15 bg-white/50 py-20 text-center">
          <Search className="h-8 w-8 text-slate-300" />
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

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) setCreateOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500" />
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
                  className="bg-slate-950/70"
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
                      className="pl-8 bg-slate-950/70 font-mono tracking-widest text-sm font-semibold text-slate-200 cursor-default select-all"
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
                  className="bg-slate-950/70 resize-none"
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
              className="bg-amber-400 hover:bg-amber-600 text-white min-w-28"
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
      className="group relative flex flex-col rounded-2xl border border-amber-500/15 bg-stone-950/70 p-5 text-left shadow-lg shadow-indigo-500/5 backdrop-blur-md transition-all hover:shadow-indigo-500/10 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
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
      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-amber-700 transition-colors">
        {subject.subject_name ?? "Untitled Subject"}
      </h3>
      {subject.description ? (
        <p className="mb-4 flex-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {subject.description}
        </p>
      ) : (
        <p className="mb-4 flex-1 text-xs italic text-slate-300">
          No description
        </p>
      )}
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
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingSubject, setLoadingSubject] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [status, setStatus] = useState("");
  const [activeComposer, setActiveComposer] = useState<
    "activity" | "material" | null
  >(null);
  const [activeTab, setActiveTab] = useState<"content" | "students">("content");

  // ── Activity create form ──────────────────────────────────────────────────
  const [activityTitle, setActivityTitle] = useState("");
  const [activityInstructions, setActivityInstructions] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [activityFile, setActivityFile] = useState<File | null>(null);
  const [activityDragging, setActivityDragging] = useState(false);

  // ── Material create form ──────────────────────────────────────────────────
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialDragging, setMaterialDragging] = useState(false);

  // ── Edit activity dialog ──────────────────────────────────────────────────
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editActTitle, setEditActTitle] = useState("");
  const [editActInstructions, setEditActInstructions] = useState("");
  const [editActDate, setEditActDate] = useState("");
  const [editActPoints, setEditActPoints] = useState(100);
  const [editActFile, setEditActFile] = useState<File | null>(null);
  const [editActDragging, setEditActDragging] = useState(false);
  const [editActRemoveFile, setEditActRemoveFile] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);

  // ── Edit material dialog ──────────────────────────────────────────────────
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [editMatTitle, setEditMatTitle] = useState("");
  const [editMatDescription, setEditMatDescription] = useState("");
  const [editMatFile, setEditMatFile] = useState<File | null>(null);
  const [editMatDragging, setEditMatDragging] = useState(false);
  const [editMatRemoveFile, setEditMatRemoveFile] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);

  // ── Delete confirm dialog ─────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "activity" | "material";
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const subject = useMemo(
    () => subjects.find((item) => item.id === subjectId) ?? null,
    [subjectId, subjects],
  );

  const assignmentActivities = useMemo(
    () => activities.filter((a) => a.type !== "quiz" && a.type !== "exam"),
    [activities],
  );
  const quizActivities = useMemo(
    () => activities.filter((a) => a.type === "quiz"),
    [activities],
  );
  const examActivities = useMemo(
    () => activities.filter((a) => a.type === "exam"),
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
    const load = async () => {
      if (!user) return;
      setLoadingSubject(true);
      const nextSubjects = await fetchTeacherSubjects(user.id);
      if (!isMounted) return;
      setSubjects(nextSubjects);
      setLoadingSubject(false);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    loadSubjectPosts(subjectId);
  }, [subjectId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
      file: activityFile ?? undefined,
    });
    setActivityTitle("");
    setActivityInstructions("");
    setActivityDate("");
    setActivityFile(null);
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

  const openEditActivity = (a: Activity) => {
    setEditActivity(a);
    setEditActTitle(a.title ?? "");
    setEditActInstructions(a.instructions ?? "");
    setEditActDate(a.due_date ?? "");
    setEditActPoints(a.points ?? 100);
    setEditActFile(null);
    setEditActRemoveFile(false);
  };

  const onSaveActivity = async () => {
    if (!editActivity || !subjectId) return;
    setSavingActivity(true);
    await updateActivityRecord(editActivity.id, {
      title: editActTitle,
      instructions: editActInstructions,
      due_date: editActDate,
      points: editActPoints,
      file: editActFile ?? undefined,
      subject_id: subjectId,
      old_file_url: editActivity.file_url,
      remove_file: editActRemoveFile,
    });
    setEditActRemoveFile(false);
    setSavingActivity(false);
    setEditActivity(null);
    setStatus("Activity updated.");
    await loadSubjectPosts(subjectId);
  };

  const openEditMaterial = (m: Material) => {
    setEditMaterial(m);
    setEditMatTitle(m.title ?? "");
    setEditMatDescription(m.description ?? "");
    setEditMatFile(null);
    setEditMatRemoveFile(false);
  };

  const onSaveMaterial = async () => {
    if (!editMaterial || !subjectId) return;
    setSavingMaterial(true);
    await updateMaterial(editMaterial.id, {
      title: editMatTitle,
      description: editMatDescription,
      file: editMatFile ?? undefined,
      subject_id: subjectId,
      old_file_url: editMaterial.file_url,
      remove_file: editMatRemoveFile,
    });
    setEditMatRemoveFile(false);
    setSavingMaterial(false);
    setEditMaterial(null);
    setStatus("Material updated.");
    await loadSubjectPosts(subjectId);
  };

  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    if (confirmDelete.type === "activity") {
      await deleteActivity(confirmDelete.id);
    } else {
      await deleteMaterial(confirmDelete.id);
    }
    setDeleting(false);
    setConfirmDelete(null);
    setStatus(
      `${confirmDelete.type === "activity" ? "Activity" : "Material"} deleted.`,
    );
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
          className="mb-3 inline-flex items-center text-sm font-medium text-stone-800 hover:text-amber-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4 text-stone-800" />
          Back to subjects
        </Link>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">
          {subject?.subject_code ?? "Loading subject"}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-stone-800">
          {subject?.description ?? "Manage posted materials and activities."}
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-amber-500/10 bg-stone-950/60 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "content"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Content
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "students"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-slate-200"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Students
        </button>
      </div>

      {/* ── Content tab ─────────────────────────────────────────────────────── */}
      {activeTab === "content" && (
        <>
          {/* Stats */}
          <div className="mb-6 grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard
              title="Materials"
              value={loadingPosts ? "..." : materials.length}
              accent="emerald"
            />
            <StatCard
              title="Activities"
              value={loadingPosts ? "..." : assignmentActivities.length}
              accent="violet"
            />
            <StatCard
              title="Quizzes"
              value={loadingPosts ? "..." : quizActivities.length}
              accent="indigo"
            />
            <StatCard
              title="Exams"
              value={loadingPosts ? "..." : examActivities.length}
              accent="sky"
            />
          </div>

          {/* Status toast */}
          {status ? (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-700">
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
                        <ClipboardList className="h-5 w-5 text-amber-600" />
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
                    <FileDropZone
                      id="activity-file-input"
                      file={activityFile}
                      onFile={setActivityFile}
                      dragging={activityDragging}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setActivityDragging(true);
                      }}
                      onDragLeave={() => setActivityDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setActivityDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) setActivityFile(f);
                      }}
                    />
                    <div className="flex items-center gap-3">
                      {activityFile && (
                        <button
                          type="button"
                          onClick={() => setActivityFile(null)}
                          className="text-xs text-rose-500 hover:underline"
                        >
                          Remove file
                        </button>
                      )}

                      <Button type="submit">
                        <Plus className="mr-2 h-4 w-4" />
                        Post activity
                      </Button>
                    </div>
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
                    <FileDropZone
                      id="material-file-input"
                      file={materialFile}
                      onFile={setMaterialFile}
                      dragging={materialDragging}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setMaterialDragging(true);
                      }}
                      onDragLeave={() => setMaterialDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setMaterialDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) setMaterialFile(f);
                      }}
                    />
                    <Button type="submit" disabled={!materialFile}>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload material
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Materials + Activities grid ───────────────────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Materials */}
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
                        className="h-24 animate-pulse rounded-xl bg-slate-900/65"
                      />
                    ))}
                  </div>
                ) : materials.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-emerald-200 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                    No materials uploaded yet.
                  </p>
                ) : (
                  materials.map((material) => (
                    <ListItemCard key={material.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {material.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {material.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {material.file_url && (
                            <a
                              href={material.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-sm font-medium text-amber-600 hover:underline"
                            >
                              Open
                              <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditMaterial(material)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                            title="Edit material"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: "material",
                                id: material.id,
                                label: material.title ?? "this material",
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete material"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </ListItemCard>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Activities (assignments) */}
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
                        className="h-24 animate-pulse rounded-xl bg-slate-900/65"
                      />
                    ))}
                  </div>
                ) : assignmentActivities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-violet-200 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                    No activities posted yet.
                  </p>
                ) : (
                  assignmentActivities.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      onResponses={() =>
                        navigate(`/teacher/activities/${activity.id}/responses`)
                      }
                      onEdit={() => openEditActivity(activity)}
                      onDelete={() =>
                        setConfirmDelete({
                          type: "activity",
                          id: activity.id,
                          label: activity.title ?? "this activity",
                        })
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Quizzes + Exams full-width row ───────────────────────────────────── */}
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {/* Quizzes */}
            <Card>
              <div className="h-1 bg-linear-to-r from-amber-500 to-yellow-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                  Quizzes
                </CardTitle>
                <CardDescription>
                  Quiz-type assessments posted for this subject.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPosts ? (
                  <div className="space-y-3">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="h-24 animate-pulse rounded-xl bg-slate-900/65"
                      />
                    ))}
                  </div>
                ) : quizActivities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-amber-500/20 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                    No quizzes posted yet.
                  </p>
                ) : (
                  quizActivities.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      accentColor="amber"
                      onResponses={() =>
                        navigate(`/teacher/quizzes/${activity.id}/responses`)
                      }
                      onEdit={() => openEditActivity(activity)}
                      onDelete={() =>
                        setConfirmDelete({
                          type: "activity",
                          id: activity.id,
                          label: activity.title ?? "this quiz",
                        })
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Exams */}
            <Card>
              <div className="h-1 bg-linear-to-r from-rose-500 to-pink-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-rose-600" />
                  Exams
                </CardTitle>
                <CardDescription>
                  Exam-type assessments posted for this subject.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPosts ? (
                  <div className="space-y-3">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="h-24 animate-pulse rounded-xl bg-slate-900/65"
                      />
                    ))}
                  </div>
                ) : examActivities.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-rose-500/20 bg-slate-900/65 p-4 text-sm text-muted-foreground">
                    No exams posted yet.
                  </p>
                ) : (
                  examActivities.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      accentColor="rose"
                      onResponses={() =>
                        navigate(`/teacher/quizzes/${activity.id}/responses`)
                      }
                      onEdit={() => openEditActivity(activity)}
                      onDelete={() =>
                        setConfirmDelete({
                          type: "activity",
                          id: activity.id,
                          label: activity.title ?? "this exam",
                        })
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Students tab ────────────────────────────────────────────────────── */}
      {activeTab === "students" && <StudentsTab subjectId={subjectId} />}

      {/* ── Edit activity dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!editActivity}
        onOpenChange={(o) => {
          if (!o) setEditActivity(null);
        }}
      >
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Edit Activity</DialogTitle>
              <DialogDescription>
                Update the activity details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editActTitle}
                onChange={(e) => setEditActTitle(e.target.value)}
                placeholder="Activity title"
              />
              <Textarea
                value={editActInstructions}
                onChange={(e) => setEditActInstructions(e.target.value)}
                placeholder="Instructions"
                rows={3}
              />
              <Input
                value={editActDate}
                onChange={(e) => setEditActDate(e.target.value)}
                type="date"
              />
              <Input
                value={editActPoints}
                onChange={(e) => setEditActPoints(Number(e.target.value))}
                type="number"
                min={0}
                placeholder="Points"
              />
              <p className="text-xs text-muted-foreground">
                Upload a new file to replace the existing attachment (optional).
              </p>
              {editActivity?.file_url && !editActFile && !editActRemoveFile && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span className="flex-1 truncate text-slate-200">
                    Current attachment
                  </span>
                  <a
                    href={editActivity.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-amber-600 hover:underline"
                  >
                    Open <ExternalLink className="inline h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditActRemoveFile(true)}
                    className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {editActRemoveFile && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    Attachment will be removed on save.
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditActRemoveFile(false)}
                    className="text-xs underline hover:no-underline"
                  >
                    Undo
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editActivity?.file_url && !editActRemoveFile
                  ? "Upload a new file to replace the existing attachment."
                  : "Attach a file to this activity (optional)."}
              </p>
              <FileDropZone
                id="edit-activity-file-input"
                file={editActFile}
                onFile={setEditActFile}
                dragging={editActDragging}
                onDragOver={(e) => {
                  e.preventDefault();
                  setEditActDragging(true);
                }}
                onDragLeave={() => setEditActDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setEditActDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setEditActFile(f);
                }}
              />
              {editActFile && (
                <button
                  type="button"
                  onClick={() => setEditActFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove new file
                </button>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditActivity(null)}
              disabled={savingActivity}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveActivity}
              disabled={savingActivity}
              className="bg-amber-400 hover:bg-amber-600 text-white min-w-24"
            >
              {savingActivity ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit material dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!editMaterial}
        onOpenChange={(o) => {
          if (!o) setEditMaterial(null);
        }}
      >
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-emerald-500 to-sky-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Edit Material</DialogTitle>
              <DialogDescription>
                Update the material details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editMatTitle}
                onChange={(e) => setEditMatTitle(e.target.value)}
                placeholder="Material title"
              />
              <Textarea
                value={editMatDescription}
                onChange={(e) => setEditMatDescription(e.target.value)}
                placeholder="Description"
                rows={3}
              />
              {editMaterial?.file_url && !editMatFile && !editMatRemoveFile && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="flex-1 truncate text-slate-200">
                    Current file
                  </span>
                  <a
                    href={editMaterial.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-amber-600 hover:underline"
                  >
                    Open <ExternalLink className="inline h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditMatRemoveFile(true)}
                    className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {editMatRemoveFile && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">File will be removed on save.</span>
                  <button
                    type="button"
                    onClick={() => setEditMatRemoveFile(false)}
                    className="text-xs underline hover:no-underline"
                  >
                    Undo
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editMaterial?.file_url && !editMatRemoveFile
                  ? "Upload a new file to replace the existing one."
                  : "Attach a file to this material (optional)."}
              </p>
              <FileDropZone
                id="edit-material-file-input"
                file={editMatFile}
                onFile={setEditMatFile}
                dragging={editMatDragging}
                onDragOver={(e) => {
                  e.preventDefault();
                  setEditMatDragging(true);
                }}
                onDragLeave={() => setEditMatDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setEditMatDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setEditMatFile(f);
                }}
              />
              {editMatFile && (
                <button
                  type="button"
                  onClick={() => setEditMatFile(null)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove new file
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a new file to replace the existing one (optional).
              </p>
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMaterial(null)}
              disabled={savingMaterial}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveMaterial}
              disabled={savingMaterial}
              className="bg-emerald-400 hover:bg-emerald-600 text-white min-w-24"
            >
              {savingMaterial ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-sm overflow-hidden p-0">
          <div className="h-1 bg-rose-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>
                Delete{" "}
                {confirmDelete?.type === "activity" ? "Activity" : "Material"}?
              </DialogTitle>
              <DialogDescription>
                "{confirmDelete?.label}" will be permanently deleted. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onConfirmDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white min-w-24"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
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

// ─── ActivityListItem ─────────────────────────────────────────────────────────

type ActivityAccent = "violet" | "amber" | "rose";

const activityAccentStyles: Record<
  ActivityAccent,
  { responses: string; due: string; points: string }
> = {
  violet: {
    responses: "hover:bg-amber-400/10 hover:text-amber-600",
    due: "bg-violet-400/10 text-violet-300",
    points: "bg-amber-400/10 text-amber-300",
  },
  amber: {
    responses: "hover:bg-amber-400/10 hover:text-amber-600",
    due: "bg-amber-400/10 text-amber-300",
    points: "bg-yellow-400/10 text-yellow-300",
  },
  rose: {
    responses: "hover:bg-rose-400/10 hover:text-rose-500",
    due: "bg-rose-400/10 text-rose-300",
    points: "bg-pink-400/10 text-pink-300",
  },
};

function ActivityListItem({
  activity,
  accentColor = "violet",
  onResponses,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  accentColor?: ActivityAccent;
  onResponses: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = activityAccentStyles[accentColor];
  return (
    <ListItemCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{activity.title}</p>
          {activity.instructions && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {activity.instructions}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${s.due}`}>
              Due: {activity.due_date ?? "No due date"}
            </span>
            <span className={`rounded-full px-2.5 py-1 ${s.points}`}>
              {activity.points ?? 0} pts
            </span>
            {activity.file_url && (
              <a
                href={activity.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-slate-300 hover:underline"
              >
                Attachment
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onResponses}
            className={`rounded-lg p-1.5 text-slate-400 transition-colors ${s.responses}`}
            title="View responses"
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </ListItemCard>
  );
}
