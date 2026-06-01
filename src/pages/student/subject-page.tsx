import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
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
    <AppShell title="Subject Details">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No materials uploaded yet.</p>
            ) : (
              materials.map((material) => (
                <ListItemCard key={material.id}>
                  <p className="font-medium">{material.title}</p>
                  <p className="text-sm text-muted-foreground">{material.description}</p>
                  {material.file_url ? (
                    <a className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:underline" href={material.file_url} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  ) : null}
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle>Quizzes & Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quizItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quizzes available yet.</p>
            ) : (
              quizItems.map((quiz) => (
                <ListItemCard key={quiz.id}>
                  <p className="font-medium">{quiz.title}</p>
                  <p className="text-sm text-muted-foreground">Points: {quiz.points ?? 0}</p>
                </ListItemCard>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
