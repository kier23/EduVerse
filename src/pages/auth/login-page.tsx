import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/layout/auth-card";
import { fetchUserProfile } from "@/lib/api/eduverse";
import { dashboardPathForRole } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
  name: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${name} timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    console.log("Login submit", { email });
    setSubmitting(true);
    setError("");
    try {
      console.log("Before signIn");
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        "supabase.auth.signInWithPassword",
      );
      console.log("after signIn");
      console.log("Sign in response", { data, signInError });
      if (signInError) throw signInError;
      if (!data.user) {
        console.error("Login response missing user", data);
        throw new Error("User not found after login.");
      }

      console.log("User metadata", {
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
      });
      const roleFromMetadata = (data.user.user_metadata?.role ??
        data.user.app_metadata?.role) as UserRole | null;
      if (roleFromMetadata) {
        console.log("Navigating using metadata role", {
          role: roleFromMetadata,
          path: dashboardPathForRole(roleFromMetadata),
        });
        navigate(dashboardPathForRole(roleFromMetadata));
        return;
      }

      console.log("Fetching profile for user", data.user.id);
      navigate("/");
      return;
    } catch (caught) {
      console.error("Login failed", caught);
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(false);
      console.log("Login submit finished");
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your EduVerse account."
      backTo="/"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in..." : "Log in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            to="/signup"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign up as teacher or student
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
