import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { fetchTeacherSubjects, type Subject } from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function TeacherDashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTeacherSubjects(user.id).then(setSubjects).finally(() => setLoading(false));
  }, [user]);

  return (
    <AppShell title="Teacher Dashboard / Analytics">
      <div className="mb-4 flex gap-2">
        <Link to="/teacher/subjects" className={cn(buttonVariants({ variant: "outline" }))}>Manage Subjects</Link>
        <Link to="/teacher/calendar" className={cn(buttonVariants({ variant: "outline" }))}>Calendar / Schedule</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Subjects</CardTitle></CardHeader><CardContent>{loading ? "Loading..." : subjects.length}</CardContent></Card>
        <Card><CardHeader><CardTitle>Students (estimated)</CardTitle></CardHeader><CardContent>{subjects.length * 35}</CardContent></Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Subject List</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="rounded border p-3">
              <p className="font-medium">{subject.subject_code} - {subject.subject_name}</p>
              <p className="text-sm text-muted-foreground">{subject.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
