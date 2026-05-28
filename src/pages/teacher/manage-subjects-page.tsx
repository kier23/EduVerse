import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/layouts/app-shell";
import { createActivity, fetchTeacherSubjects, type Subject, uploadMaterial } from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

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
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Subject</label>
        <select
          value={selectedSubjectId}
          onChange={(event) => setSelectedSubjectId(event.target.value)}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.subject_code} - {subject.subject_name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Create New Activity</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateActivity}>
              <Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Activity title" required />
              <Input value={activityDate} onChange={(event) => setActivityDate(event.target.value)} type="date" required />
              <Button type="submit">Create activity</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upload Materials</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onUploadMaterial}>
              <Input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Material title" required />
              <Input value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} placeholder="File URL" required />
              <Button type="submit">Upload material</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
    </AppShell>
  );
}
