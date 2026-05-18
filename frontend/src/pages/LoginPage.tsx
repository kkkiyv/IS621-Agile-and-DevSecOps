import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

const roles: {
  role: Role;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    role: "TEACHER",
    title: "Teacher",
    description: "Submit and track referrals",
    color: "role-card--teacher",
  },
  {
    role: "COUNSELLOR",
    title: "Counsellor",
    description: "Triage and manage cases",
    color: "role-card--counsellor",
  },
  {
    role: "LEAD_ADMIN",
    title: "Lead",
    description: "View dashboard and audit logs",
    color: "role-card--lead",
  },
];

export function LoginPage() {
  const { loginDemo, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role === "TEACHER") navigate("/teacher/referrals", { replace: true });
    else if (user.role === "COUNSELLOR") navigate("/counsellor/queue", { replace: true });
    else navigate("/counsellor/queue", { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSelect = async (role: Role) => {
    setError(null);
    setLoading(role);
    try {
      await loginDemo(role);
      if (role === "TEACHER") navigate("/teacher/referrals");
      else if (role === "COUNSELLOR") navigate("/counsellor/queue");
      else navigate("/counsellor/queue");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-title">Student Support Portal</h1>
      <p className="login-subtitle">Select your role to continue (Demo Mode)</p>
      {error && <p className="form-error form-error--center">{error}</p>}
      <div className="role-grid">
        {roles.map((r) => (
          <button
            key={r.role}
            type="button"
            className={`role-card ${r.color}`}
            disabled={loading !== null}
            onClick={() => handleSelect(r.role)}
          >
            <span className="role-card-icon" aria-hidden />
            <span className="role-card-title">{r.title}</span>
            <span className="role-card-desc">{r.description}</span>
            {loading === r.role && (
              <span className="role-card-loading">Signing in…</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
