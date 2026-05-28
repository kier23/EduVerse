import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { fetchSubjectActivities, fetchSubjectMaterials, type Activity, type Material } from "@/lib/api/eduverse";

export function StudentSubjectPage() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("id") ?? "";
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!subjectId) return;
    fetchSubjectMaterials(subjectId).then(setMaterials);
    fetchSubjectActivities(subjectId).then(setActivities);
  }, [subjectId]);

  const quizItems = useMemo(() => activities.filter((item) => item.type === "quiz"), [activities]);

  return (
    <AppShell title="Student Subject Page">
      <Card className="mb-4">
        <CardHeader><CardTitle>Materials</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {materials.map((material) => (
            <div key={material.id} className="rounded border p-3">
              <p className="font-medium">{material.title}</p>
              <p className="text-sm text-muted-foreground">{material.description}</p>
              {material.file_url ? <a className="text-sm underline" href={material.file_url} target="_blank" rel="noreferrer">Open file</a> : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Quizzes and Scores</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {quizItems.map((quiz) => (
            <div key={quiz.id} className="rounded border p-3">
              <p className="font-medium">{quiz.title}</p>
              <p className="text-sm text-muted-foreground">Points: {quiz.points ?? 0}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
