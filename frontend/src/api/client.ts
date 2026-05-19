const API_BASE = import.meta.env.VITE_API_URL ?? "";

export const STORAGE_TOKEN = "casehub_token";
export const STORAGE_USER = "casehub_user";
export const UNAUTHORIZED_EVENT = "casehub:unauthorized";

function getToken(): string | null {
  return sessionStorage.getItem(STORAGE_TOKEN);
}

function clearSession(): void {
  sessionStorage.removeItem(STORAGE_TOKEN);
  sessionStorage.removeItem(STORAGE_USER);
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    clearSession();
    if (window.location.pathname !== "/") {
      window.location.assign("/");
    }
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.error ||
      body.errors?.[0]?.msg ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
