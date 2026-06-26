import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/layout/auth-card";
import { dashboardPathForRole } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";
import type { SignupRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const signupRoles: SignupRole[] = ["teacher", "student"];

export function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<SignupRole>("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    // Basic username validation
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(
        "Username must be 3–20 characters and contain only letters, numbers, or underscores.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role, username },
        },
      });
      console.log("Signup data:", data);
      console.log("Signup error:", signUpError);
      if (signUpError) {
        console.log(signUpError);
        throw signUpError;
      }
      if (!data.user) throw new Error("Account could not be created.");

      // Persist username to the users table so login-by-username lookup works.
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email,
          full_name: fullName,
          role,
          username,
        },
        { onConflict: "id" },
      );
      if (upsertError) console.error("Failed to save username:", upsertError);

      if (data.session) {
        navigate(dashboardPathForRole(role));
        return;
      }

      setSuccess(
        "Account created. Check your email to confirm, then log in. check your spam folder if you don't see it.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create an account"
      description="Teachers and students can sign up here. Admin accounts are invite-only."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <Input
          placeholder="Username (e.g. kier_edu)"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div className="relative">
          <Input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-16"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="relative">
          <Input
            placeholder="Confirm password"
            type={showConfirmPassword ? "text" : "password"}
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="pr-16"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {signupRoles.map((item) => (
            <Button
              key={item}
              type="button"
              variant={role === item ? "default" : "outline"}
              className={cn("capitalize", role === item && "shadow-md")}
              onClick={() => setRole(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account..." : "Sign up"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-amber-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
