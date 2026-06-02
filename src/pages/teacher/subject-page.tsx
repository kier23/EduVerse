import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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
import { ListItemCard } from "@/components/layout/list-item-card";
import { StatCard } from "@/components/layout/stat-card";
import { AppShell } from "@/layouts/app-shell";
import {
  createActivity,
  fetchSubjectActivities,
  fetchSubjectMaterials,
  fetchTeacherSubjects,
  type Activity,
  type Material,
  type Subject,
  uploadMaterial,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

export function TeacherSubjectPage() {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingSubject, setLoadingSubject] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityInstructions, setActivityInstructions] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
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
    if (!subjectId) return;
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
    if (!subjectId || !user) return;

    await uploadMaterial({
      subject_id: subjectId,
      teacher_id: user.id,
      title: materialTitle,
      description: materialDescription || "Class material upload",
      file_url: materialUrl,
    });

    setMaterialTitle("");
    setMaterialDescription("");
    setMaterialUrl("");
    setStatus("Material uploaded.");
    setActiveComposer(null);
    await loadSubjectPosts(subjectId);
  };

  if (!subjectId) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (!loadingSubject && subjects.length > 0 && !subject) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return (
    <AppShell title={subject?.subject_name ?? "Subject Overview"}>
      <div className="mb-6">
        <div>
          <Link
            to="/teacher/dashboard"
            className="mb-3 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-indigo-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            {subject?.subject_code ?? "Loading subject"}
          </p>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {subject?.description ?? "Manage posted materials and activities."}
          </p>
        </div>
      </div>

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

      {status ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeComposer === "activity" ? "default" : "outline"}
          onClick={() =>
            setActiveComposer((current) =>
              current === "activity" ? null : "activity",
            )
          }
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Create activity
        </Button>
        <Button
          type="button"
          variant={activeComposer === "material" ? "default" : "outline"}
          onClick={() =>
            setActiveComposer((current) =>
              current === "material" ? null : "material",
            )
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          Upload material
        </Button>
      </div>

      {activeComposer ? (
        <div className="mb-6">
          {activeComposer === "activity" ? (
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
                aria-label="Close form"
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
                onChange={(event) => setActivityTitle(event.target.value)}
                placeholder="Activity title"
                required
              />
              <Textarea
                value={activityInstructions}
                onChange={(event) => setActivityInstructions(event.target.value)}
                placeholder="Instructions"
                rows={3}
              />
              <Input
                value={activityDate}
                onChange={(event) => setActivityDate(event.target.value)}
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
          ) : (
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
                  Share a file link or resource with students.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveComposer(null)}
                aria-label="Close form"
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
                onChange={(event) => setMaterialTitle(event.target.value)}
                placeholder="Material title"
                required
              />
              <Textarea
                value={materialDescription}
                onChange={(event) => setMaterialDescription(event.target.value)}
                placeholder="Description"
                rows={3}
              />
              <Input
                value={materialUrl}
                onChange={(event) => setMaterialUrl(event.target.value)}
                placeholder="File URL"
                required
              />
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Upload material
              </Button>
            </form>
          </CardContent>
        </Card>
          )}
        </div>
      ) : null}

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
                {[1, 2].map((item) => (
                  <div
                    key={item}
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
                    {material.file_url ? (
                      <a
                        className="inline-flex shrink-0 items-center text-sm font-medium text-indigo-600 hover:underline"
                        href={material.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    ) : null}
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
                {[1, 2].map((item) => (
                  <div
                    key={item}
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
