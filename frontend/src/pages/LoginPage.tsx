import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import { redirectAfterLogin } from "../utils/authRedirect";

const DEMO_ACCOUNTS = [
  { email: "teacher@casehub.demo", role: "Teacher" },
  { email: "counsellor@casehub.demo", role: "Counsellor" },
  { email: "lead@casehub.demo", role: "Lead" },
] as const;

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
  const { login, loginDemo, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(redirectAfterLogin(user), { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setFormLoading(true);
    try {
      const signedIn = await login(email, password);
      navigate(redirectAfterLogin(signedIn));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDemoSelect = async (role: Role) => {
    setError(null);
    setDemoLoading(role);
    try {
      const signedIn = await loginDemo(role);
      navigate(redirectAfterLogin(signedIn));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign in failed");
    } finally {
      setDemoLoading(null);
    }
  };

  const busy = formLoading || demoLoading !== null;
  const missingApiUrl =
    import.meta.env.PROD && !import.meta.env.VITE_API_URL?.trim();

  return (
    <div className="login-page">
      <div className="login-header">
        <h1 className="login-title">Student Support Portal</h1>
        <p className="login-subtitle">Sign in to CaseHub with your email and password</p>
      </div>

      {missingApiUrl && (
        <p className="login-deploy-warning" role="alert">
          This build has no API URL configured. Set GitHub secret{" "}
          <code>VITE_API_URL</code> to your public backend, then redeploy. See{" "}
          <code>docs/DEPLOY-GITHUB-PAGES.md</code>.
        </p>
      )}

      <form
        className="card login-card form-card"
        onSubmit={handlePasswordLogin}
        noValidate
      >
        {error && !showDemo && <p className="form-error">{error}</p>}

        <label className="field">
          <span>
            Email <span className="required">*</span>
          </span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
        </label>

        <label className="field">
          <span>
            Password <span className="required">*</span>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
            minLength={8}
          />
        </label>

        <p className="field-hint login-hint">
          Seeded demo accounts use password <strong>demo123!</strong>
        </p>

        <details className="login-accounts">
          <summary>View demo account emails</summary>
          <ul className="login-accounts-list">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="login-accounts-pick"
                  disabled={busy}
                  onClick={() => setEmail(a.email)}
                >
                  <span className="login-accounts-role">{a.role}</span>
                  <span className="login-accounts-email">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>

        <div className="form-actions login-form-actions">
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={busy}
          >
            {formLoading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      <div className="login-divider" aria-hidden>
        <span>or</span>
      </div>

      <button
        type="button"
        className="btn btn-ghost login-demo-toggle"
        disabled={busy}
        onClick={() => {
          setShowDemo((v) => !v);
          setError(null);
        }}
      >
        {showDemo ? "Hide demo mode" : "Continue with demo mode (role cards)"}
      </button>

      {showDemo && (
        <section className="login-demo-section" aria-label="Demo mode">
          <p className="login-subtitle login-subtitle--demo">
            Select your role to continue (no password required)
          </p>
          {error && <p className="form-error form-error--center">{error}</p>}
          <div className="role-grid role-grid--login">
            {roles.map((r) => (
              <button
                key={r.role}
                type="button"
                className={`role-card ${r.color}`}
                disabled={busy}
                onClick={() => handleDemoSelect(r.role)}
              >
                <span className="role-card-icon" aria-hidden />
                <span className="role-card-title">{r.title}</span>
                <span className="role-card-desc">{r.description}</span>
                {demoLoading === r.role && (
                  <span className="role-card-loading">Signing in…</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
