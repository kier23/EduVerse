import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/layouts/app-shell";
import { createSubject } from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

export function ManageSubjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [status, setStatus] = useState("");

  const generateClassCode = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
      { length: 6 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  };

  const onCreateSubject = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const subjectCode = generateClassCode();
    const newSubject = await createSubject({
      teacher_id: user.id,
      subject_code: subjectCode,
      subject_name: subjectName,
      description: subjectDescription,
    });

    setSubjectName("");
    setSubjectDescription("");
    setStatus(`Subject created. Class code: ${subjectCode}`);
    navigate(`/teacher/subjects/${newSubject.id}`);
  };

  return (
    <AppShell title="Add Subject">
      <Card className="mb-6">
        <div className="h-1 bg-linear-to-r from-indigo-500 to-violet-500" />
        <CardHeader>
          <CardTitle>Create New Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onCreateSubject}>
            <Input
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="Subject name"
              required
            />
            <Textarea
              value={subjectDescription}
              onChange={(event) => setSubjectDescription(event.target.value)}
              placeholder="Description"
              rows={3}
              required
            />
            <Button type="submit">Create subject</Button>
          </form>
        </CardContent>
      </Card>

      {status ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {status}
        </p>
      ) : null}
    </AppShell>
  );
}
