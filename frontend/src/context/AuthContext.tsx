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

function loadUser(): User | null {
  const raw = sessionStorage.getItem(STORAGE_USER);
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

  // Clerk-synced user state
  const [clerkUser, setClerkUser] = useState<User | null>(null);

  // Register Clerk token getter so apiFetch uses it automatically
  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  // Sync Clerk user to backend whenever Clerk signs in
  useEffect(() => {
    if (!isSignedIn) {
      setClerkUser(null);
      return;
    }
    apiFetch<User>("/api/auth/sync", { method: "POST" })
      .then(setClerkUser)
      .catch(console.error);
  }, [isSignedIn]);

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
  const loading = !isLoaded;

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
