import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
import { StatCard } from "@/components/layout/stat-card";
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
    <AppShell title="Teacher Dashboard">
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/teacher/subjects" className={cn(buttonVariants({ variant: "outline" }))}>
          Manage Subjects
        </Link>
        <Link to="/teacher/calendar" className={cn(buttonVariants({ variant: "outline" }))}>
          Calendar / Schedule
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Subjects" value={loading ? "..." : subjects.length} accent="indigo" />
        <StatCard title="Students (estimated)" value={subjects.length * 35} accent="violet" />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Subject List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subjects.map((subject) => (
            <ListItemCard key={subject.id}>
              <p className="font-medium">{subject.subject_code} — {subject.subject_name}</p>
              <p className="text-sm text-muted-foreground">{subject.description}</p>
            </ListItemCard>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
