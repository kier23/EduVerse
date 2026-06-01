import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/layouts/app-shell";
import { createActivity, fetchTeacherSubjects, type Subject, uploadMaterial } from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function ManageSubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchTeacherSubjects(user.id).then((rows) => {
      setSubjects(rows);
      setSelectedSubjectId(rows[0]?.id ?? "");
    });
  }, [user]);

  const onCreateActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSubjectId || !user) return;
    await createActivity({
      subject_id: selectedSubjectId,
      teacher_id: user.id,
      title: activityTitle,
      instructions: "Please complete before due date.",
      type: "assignment",
      due_date: activityDate,
      points: 100,
    });
    setStatus("Activity created.");
    setActivityTitle("");
    setActivityDate("");
  };

  const onUploadMaterial = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSubjectId || !user) return;
    await uploadMaterial({
      subject_id: selectedSubjectId,
      teacher_id: user.id,
      title: materialTitle,
      description: "Class material upload",
      file_url: materialUrl,
    });
    setStatus("Material uploaded.");
    setMaterialTitle("");
    setMaterialUrl("");
  };

  return (
    <AppShell title="Manage Subjects">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Select subject</label>
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className={cn(
              "h-10 w-full rounded-xl border border-indigo-100 bg-white/80 px-3 text-sm shadow-sm backdrop-blur-sm",
              "focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30",
            )}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subject_code} — {subject.subject_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <CardHeader>
            <CardTitle>Create New Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateActivity}>
              <Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Activity title" required />
              <Input value={activityDate} onChange={(event) => setActivityDate(event.target.value)} type="date" required />
              <Button type="submit">Create activity</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardHeader>
            <CardTitle>Upload Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onUploadMaterial}>
              <Input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Material title" required />
              <Input value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} placeholder="File URL" required />
              <Button type="submit">Upload material</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {status ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}
    </AppShell>
  );
}
