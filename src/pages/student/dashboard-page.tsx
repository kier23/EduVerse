import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListItemCard } from "@/components/layout/list-item-card";
import { AppShell } from "@/layouts/app-shell";
import {
  enrollStudentInSubject,
  fetchStudentSubjects,
  fetchSubjectActivities,
  type Activity,
  type Subject,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todo, setTodo] = useState<Activity[]>([]);
  const [classCode, setClassCode] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const loadSubjects = async () => {
    if (!user) return;

    setLoading(true);
    const rows = await fetchStudentSubjects(user.id);
    setSubjects(rows);

    const activityGroups = await Promise.all(
      rows.map((subject) => fetchSubjectActivities(subject.id)),
    );
    setTodo(activityGroups.flat());
    setLoading(false);
  };

  useEffect(() => {
    loadSubjects();
  }, [user]);

  const onEnroll = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setEnrolling(true);
    setStatus("");
    setErrorMessage("");

    try {
      const subject = await enrollStudentInSubject(user.id, classCode);
      setStatus(`Enrolled in ${subject.subject_name ?? "subject"}.`);
      setClassCode("");
      await loadSubjects();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to enroll right now.",
      );
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <AppShell title="Student Dashboard">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
          <CardHeader>
            <CardTitle>My Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading subjects...
              </p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enter a class code to enroll in your first subject.
              </p>
            ) : (
              subjects.map((subject) => (
                <Link key={subject.id} to={`/student/subject?id=${subject.id}`}>
                  <ListItemCard className="block">
                    <p className="font-medium">
                      {subject.subject_code} - {subject.subject_name}
                    </p>
                  </ListItemCard>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle>To-do</CardTitle>
            <CardDescription>Upcoming activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading activities...
              </p>
            ) : todo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activities posted yet.
              </p>
            ) : (
              todo.slice(0, 8).map((activity) => (
                <ListItemCard key={activity.id}>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Due: {activity.due_date ?? "No due date"}
                  </p>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="h-1 bg-linear-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle>Enroll by class code</CardTitle>
            <CardDescription>
              Join a subject using the teacher's class code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={onEnroll}>
              <Input
                value={classCode}
                onChange={(event) =>
                  setClassCode(event.target.value.toUpperCase())
                }
                placeholder="Enter class code"
                required
              />
              <Button type="submit" disabled={enrolling}>
                {enrolling ? "Enrolling..." : "Enroll"}
              </Button>
            </form>
            {status ? (
              <p className="text-sm text-emerald-700">{status}</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
