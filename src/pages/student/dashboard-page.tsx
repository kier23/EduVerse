import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
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
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <CardHeader>
            <CardTitle>My Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.map((subject) => (
              <Link key={subject.id} to={`/student/subject?id=${subject.id}`}>
                <ListItemCard className="block">
                  <p className="font-medium">{subject.subject_code} — {subject.subject_name}</p>
                </ListItemCard>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle>To-do</CardTitle>
            <CardDescription>Upcoming activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todo.slice(0, 8).map((activity) => (
              <ListItemCard key={activity.id}>
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground">Due: {activity.due_date ?? "No due date"}</p>
              </ListItemCard>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
