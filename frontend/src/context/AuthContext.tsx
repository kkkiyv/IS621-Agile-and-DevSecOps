import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../api/client";
import type { AuthResponse, Role, User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loginDemo: (role: Role) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = "casehub_token";
const STORAGE_USER = "casehub_user";

function loadUser(): User | null {
  const raw = sessionStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_TOKEN)
  );
  const [user, setUser] = useState<User | null>(() => loadUser());

  const loginDemo = useCallback(async (role: Role) => {
    const data = await apiFetch<AuthResponse>("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    sessionStorage.setItem(STORAGE_TOKEN, data.accessToken);
    sessionStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loginDemo,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [user, token, loginDemo, logout]
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
