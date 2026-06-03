import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // loading stays true until BOTH session AND profile (if user exists) are resolved.
  // This means the app never renders with user=set but profile=null on first load.
  const [loading, setLoading] = useState(true);

  const userRef = useRef<User | null>(null);
  const profileUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const loadProfile = async (
    targetUser: User | null,
    force = false,
  ): Promise<void> => {
    if (!targetUser) {
      profileUserIdRef.current = null;
      setProfile(null);
      return;
    }
    if (!force && profileUserIdRef.current === targetUser.id) return;
    profileUserIdRef.current = targetUser.id;
    try {
      const data = await withTimeout(fetchUserProfile(targetUser.id), 1000);
      if (userRef.current?.id === targetUser.id) {
        setProfile((data as UserProfile) ?? null);
      }
    } catch (err) {
      console.error("[AUTH] loadProfile failed", err);
      if (userRef.current?.id === targetUser.id) {
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        userRef.current = nextUser;

        if (event === "INITIAL_SESSION") {
          if (initializedRef.current) return;
          initializedRef.current = true;

          // Set session/user and wait for profile before clearing loading.
          // This ensures the first render always has complete data.
          setSession(nextSession ?? null);
          setUser(nextUser);
          await loadProfile(nextUser);
          setLoading(false);

          return;
        }

        // All subsequent events update session but don't touch loading.
        setSession(nextSession ?? null);
        setUser(nextUser);

        if (event === "SIGNED_IN") {
          await loadProfile(nextUser);
          return;
        }

        if (event === "SIGNED_OUT") {
          profileUserIdRef.current = null;
          setProfile(null);
          return;
        }
      },
    );

    return () => {
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
      refreshProfile: async () => {
        await loadProfile(userRef.current, true);
      },
      setProfile,
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
