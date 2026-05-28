import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchUserProfile } from "@/lib/api/eduverse";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("User not found after login.");

      const profile = await fetchUserProfile(data.user.id);
      if (profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error(`This account is not a ${role}.`);
      }

      navigate(
        role === "teacher"
          ? "/teacher/dashboard"
          : role === "student"
            ? "/student/dashboard"
            : "/superadmin/dashboard",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Sign in with Supabase and choose your role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <div className="flex gap-2">
              <Button type="button" variant={role === "teacher" ? "default" : "outline"} onClick={() => setRole("teacher")}>
                Teacher
              </Button>
              <Button type="button" variant={role === "student" ? "default" : "outline"} onClick={() => setRole("student")}>
                Student
              </Button>
              <Button type="button" variant={role === "superadmin" ? "default" : "outline"} onClick={() => setRole("superadmin")}>
                Superadmin
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing in..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
