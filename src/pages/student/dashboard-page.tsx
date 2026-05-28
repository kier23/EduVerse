import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { fetchStudentSubjects, fetchSubjectActivities, type Activity, type Subject } from "@/lib/api/eduverse";

export function StudentDashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todo, setTodo] = useState<Activity[]>([]);

  useEffect(() => {
    fetchStudentSubjects().then(async (rows) => {
      setSubjects(rows);
      const first = rows[0];
      if (first) {
        const activities = await fetchSubjectActivities(first.id);
        setTodo(activities);
      }
    });
  }, []);

  return (
    <AppShell title="Student Dashboard">
      <Card className="mb-4">
        <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {subjects.map((subject) => (
            <Link key={subject.id} to={`/student/subject?id=${subject.id}`} className="rounded border p-3 hover:bg-accent">
              {subject.subject_code} - {subject.subject_name}
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>To-do</CardTitle><CardDescription>Upcoming activities</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {todo.slice(0, 8).map((activity) => (
            <div key={activity.id} className="rounded border p-3">
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-muted-foreground">Due: {activity.due_date ?? "No due date"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
