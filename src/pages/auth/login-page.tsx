import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/layout/auth-card";
import { dashboardPathForRole } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;
      if (!data.user) throw new Error("User not found after login.");

      // Navigate immediately using metadata role — AuthProvider will load
      // the full profile in the background via the SIGNED_IN event.
      const roleFromMetadata = (data.user.user_metadata?.role ??
        data.user.app_metadata?.role) as UserRole | null;

      navigate(
        roleFromMetadata ? dashboardPathForRole(roleFromMetadata) : "/",
        { replace: true },
      );
    } catch (caught) {
      console.error("Login failed", caught);
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(false);
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
            className="font-medium text-amber-600 hover:underline"
          >
            Sign up as teacher or student
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
