import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Plus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
import { StatCard } from "@/components/layout/stat-card";
import { AppShell } from "@/layouts/app-shell";
import {
  fetchSubjectActivities,
  fetchSubjectMaterials,
  fetchTeacherSubjects,
  type Subject,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type SubjectPostCounts = {
  activities: number;
  materials: number;
};

export function TeacherDashboardPage() {
  const { profile, user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [postCounts, setPostCounts] = useState<
    Record<string, SubjectPostCounts>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!user) return;
      setLoading(true);

      const nextSubjects = await fetchTeacherSubjects(user.id);
      if (!isMounted) return;

      setSubjects(nextSubjects);

      const counts = await Promise.all(
        nextSubjects.map(async (subject) => {
          const [activities, materials] = await Promise.all([
            fetchSubjectActivities(subject.id),
            fetchSubjectMaterials(subject.id),
          ]);

          return [
            subject.id,
            {
              activities: activities.length,
              materials: materials.length,
            },
          ] as const;
        }),
      );

      if (!isMounted) return;
      setPostCounts(Object.fromEntries(counts));
      setLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const totalActivities = useMemo(
    () =>
      Object.values(postCounts).reduce(
        (total, count) => total + count.activities,
        0,
      ),
    [postCounts],
  );

  const totalMaterials = useMemo(
    () =>
      Object.values(postCounts).reduce(
        (total, count) => total + count.materials,
        0,
      ),
    [postCounts],
  );

  return (
    <AppShell title="Teacher Dashboard">
      <p className="mb-6 text-base font-medium text-stone-950">
        Welcome!{" "}
        {profile?.full_name ??
          user?.user_metadata?.full_name ??
          user?.email ??
          "Teacher"}
      </p>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-800">
            Subjects
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Open a subject to post materials, create activities, and review what
            students can see.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/teacher/subjects"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add subject
          </Link>
          <Link
            to="/teacher/calendar"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Subjects"
          value={loading ? "..." : subjects.length}
          accent="indigo"
        />
        <StatCard
          title="Posted activities"
          value={loading ? "..." : totalActivities}
          accent="violet"
        />
        <StatCard
          title="Uploaded materials"
          value={loading ? "..." : totalMaterials}
          accent="emerald"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Subject List</CardTitle>
          <CardDescription>
            Choose a subject to manage its classroom content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-xl bg-slate-900/65"
                />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-indigo-200 bg-slate-900/65 p-6 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-amber-500" />
              <p className="mt-3 font-medium">No subjects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first subject, then it will appear here and in the
                sidebar.
              </p>
              <Link
                to="/teacher/subjects"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "mt-4",
                )}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add subject
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {subjects.map((subject) => {
                const counts = postCounts[subject.id] ?? {
                  activities: 0,
                  materials: 0,
                };

                return (
                  <Link key={subject.id} to={`/teacher/subjects/${subject.id}`}>
                    <ListItemCard className="group h-full">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                            {subject.subject_code}
                          </p>
                          <p className="mt-1 truncate text-base font-semibold">
                            {subject.subject_name}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-amber-600" />
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {subject.description || "No description provided."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-700">
                          <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                          {counts.activities} activities
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-700">
                          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                          {counts.materials} materials
                        </span>
                      </div>
                    </ListItemCard>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
