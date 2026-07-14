import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AuthCard } from "@/components/layout/auth-card";
import { supabase } from "@/lib/supabase";
import type { SignupRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const signupRoles: SignupRole[] = ["teacher", "student", "superadmin"];

type FeedbackDialog = {
  open: boolean;
  variant: "success" | "error";
  message: string;
};

/** Returns true if an account with this email already exists. */
async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/** Returns true if this username is already taken. */
async function usernameAlreadyTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<SignupRole>("student");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDialog>({
    open: false,
    variant: "success",
    message: "",
  });
  const navigate = useNavigate();

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const showError = (message: string) => {
    setFeedback({ open: true, variant: "error", message });
  };

  const showSuccess = (message: string) => {
    setFeedback({ open: true, variant: "success", message });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    // Basic username validation
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      showError(
        "Username must be 3–20 characters and contain only letters, numbers, or underscores.",
      );
      setSubmitting(false);
      return;
    }

    try {
      if (await emailAlreadyRegistered(email)) {
        showError(
          "An account with this email already exists. Try logging in instead.",
        );
        setSubmitting(false);
        return;
      }

      if (await usernameAlreadyTaken(username)) {
        showError("That username is already taken. Please choose another.");
        setSubmitting(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role, username },
        },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Account could not be created.");

      if (data.user.identities && data.user.identities.length === 0) {
        showError(
          "An account with this email already exists. Try logging in instead.",
        );
        setSubmitting(false);
        return;
      }

      resetForm();
      showSuccess(
        data.session
          ? "Account created successfully."
          : "Account created. Check your email to confirm, then log in. Check your spam folder if you don't see it.",
      );
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setFeedback((prev) => ({ ...prev, open }));
    // Only redirect on close if the dialog was reporting success.
    if (!open && feedback.variant === "success") {
      navigate("/login");
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

      <Dialog open={feedback.open} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedback.variant === "success"
                ? "Success"
                : "Something went wrong"}
            </DialogTitle>
            <DialogDescription
              className={
                feedback.variant === "error" ? "text-destructive" : undefined
              }
            >
              {feedback.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleDialogOpenChange(false)}>
              {feedback.variant === "success" ? "Continue to login" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthCard>
  );
}
