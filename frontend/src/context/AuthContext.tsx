import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";
import {
  apiFetch,
  setClerkTokenGetter,
  STORAGE_TOKEN,
  STORAGE_USER,
  UNAUTHORIZED_EVENT,
} from "../api/client";
import type { AuthResponse, Role, User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loginDemo: (role: Role) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_CLERK_USER = "clerk_user";

function loadUser(): User | null {
  const raw = sessionStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function loadClerkUser(): User | null {
  const raw = sessionStorage.getItem(STORAGE_CLERK_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistSession(data: AuthResponse): User {
  sessionStorage.setItem(STORAGE_TOKEN, data.accessToken);
  sessionStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();

  // Demo JWT state
  const [demoToken, setDemoToken] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_TOKEN)
  );
  const [demoUser, setDemoUser] = useState<User | null>(() => loadUser());

  // Clerk-synced user state — seed from cache so page loads don't block
  const [clerkUser, setClerkUser] = useState<User | null>(() => loadClerkUser());
  const [syncLoading, setSyncLoading] = useState(false);

  // Register Clerk token getter so apiFetch uses it automatically
  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // Sync Clerk user to backend whenever Clerk signs in
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      sessionStorage.removeItem(STORAGE_CLERK_USER);
      setClerkUser(null);
      return;
    }
    // Clear any stale demo session so Clerk user takes over
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setDemoToken(null);
    setDemoUser(null);

    // Only show loading spinner if there's no cached user to show yet
    if (!loadClerkUser()) setSyncLoading(true);
    apiFetch<User>("/api/auth/sync", { method: "POST" })
      .then((u) => {
        sessionStorage.setItem(STORAGE_CLERK_USER, JSON.stringify(u));
        setClerkUser(u);
      })
      .catch(console.error)
      .finally(() => setSyncLoading(false));
  }, [isLoaded, isSignedIn]);

  const applyDemoSession = useCallback((data: AuthResponse) => {
    const nextUser = persistSession(data);
    setDemoToken(data.accessToken);
    setDemoUser(nextUser);
    return nextUser;
  }, []);

  const loginDemo = useCallback(
    async (role: Role) => {
      if (isSignedIn) {
        await signOut();
        setClerkUser(null);
      }
      const data = await apiFetch<AuthResponse>("/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      return applyDemoSession(data);
    },
    [applyDemoSession, isSignedIn, signOut]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    sessionStorage.removeItem(STORAGE_CLERK_USER);
    setDemoToken(null);
    setDemoUser(null);
    setClerkUser(null);
    if (isSignedIn) signOut();
  }, [isSignedIn, signOut]);

  useEffect(() => {
    const onUnauthorized = () => {
      setDemoToken(null);
      setDemoUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const hasDemoSession = Boolean(demoToken && demoUser);
  const user = hasDemoSession ? demoUser : (clerkUser ?? demoUser);
  const isAuthenticated = Boolean(clerkUser || hasDemoSession);
  const loading = !isLoaded || syncLoading;

  const value = useMemo(
    () => ({
      user,
      token: demoToken,
      loginDemo,
      logout,
      isAuthenticated,
      loading,
    }),
    [user, demoToken, loginDemo, logout, isAuthenticated, loading]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
