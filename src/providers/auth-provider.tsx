import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    try {
      const data = await fetchUserProfile(currentUser.id);
      setProfile(data);
    } catch {
      setProfile(null);
    }
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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfile(nextSession?.user ?? null);
      setLoading(false);
    });

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
      role:
        profile?.role === "teacher" || profile?.role === "student" || profile?.role === "superadmin"
          ? profile.role
          : null,
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
