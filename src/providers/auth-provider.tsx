import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { fetchUserProfile, type UserProfile } from "@/lib/api/eduverse";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveRoleFromUser(
  user: User | null,
  profile: UserProfile | null,
): UserRole | null {
  const roleCandidate =
    profile?.role ?? user?.user_metadata?.role ?? user?.app_metadata?.role;
  if (
    roleCandidate === "teacher" ||
    roleCandidate === "student" ||
    roleCandidate === "admin" ||
    roleCandidate === "superadmin"
  ) {
    return roleCandidate;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User | null) => {
    console.log("loadProfile start", currentUser?.id);
    if (!currentUser) {
      setProfile(null);
      return;
    }
    try {
      const data = await Promise.race([
        fetchUserProfile(currentUser.id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile timeout")), 5000),
        ),
      ]);
      console.log("loadProfile success", data);
      setProfile(data as UserProfile);
    } catch (error) {
      console.error("loadProfile failed", error);
      setProfile(null);
    }
    console.log("loadProfile finished");
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      if (isMounted) setLoading(false);
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setLoading(true);
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await loadProfile(nextSession?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      role: resolveRoleFromUser(user, profile),
      loading,
      refreshProfile: async () => loadProfile(user),
    }),
    [loading, profile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
