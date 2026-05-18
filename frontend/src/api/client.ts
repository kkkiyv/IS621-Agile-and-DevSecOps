const API_BASE = import.meta.env.VITE_API_URL ?? "";

function getToken(): string | null {
  return sessionStorage.getItem("casehub_token");
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
