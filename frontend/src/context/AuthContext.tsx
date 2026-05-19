import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  STORAGE_TOKEN,
  STORAGE_USER,
  UNAUTHORIZED_EVENT,
} from "../api/client";
import type { AuthResponse, Role, User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  loginDemo: (role: Role) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
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
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_TOKEN)
  );
  const [user, setUser] = useState<User | null>(() => loadUser());

  const applySession = useCallback((data: AuthResponse) => {
    const nextUser = persistSession(data);
    setToken(data.accessToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      return applySession(data);
    },
    [applySession]
  );

  const loginDemo = useCallback(
    async (role: Role) => {
      const data = await apiFetch<AuthResponse>("/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      return applySession(data);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      loginDemo,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [user, token, login, loginDemo, logout]
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
