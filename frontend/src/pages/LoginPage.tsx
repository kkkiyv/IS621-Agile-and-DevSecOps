import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import { redirectAfterLogin } from "../utils/authRedirect";

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
  const { openSignIn } = useClerk();
  const { loginDemo, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(redirectAfterLogin(user), { replace: true });
  }, [isAuthenticated, user, navigate]);

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

  const busy = demoLoading !== null;
  const missingApiUrl =
    import.meta.env.PROD && !import.meta.env.VITE_API_URL?.trim();

  return (
    <div className="login-page">
      <div className="login-header">
        <h1 className="login-title">Student Support Portal</h1>
        <p className="login-subtitle">Sign in to CaseHub</p>
      </div>

      {missingApiUrl && (
        <p className="login-deploy-warning" role="alert">
          This build has no API URL configured. Set GitHub secret{" "}
          <code>VITE_API_URL</code> to your public backend, then redeploy. See{" "}
          <code>docs/DEPLOY-GITHUB-PAGES.md</code>.
        </p>
      )}

      <div className="card login-card form-card">
        <button
          type="button"
          className="btn btn-primary login-submit"
          disabled={busy}
          onClick={() => openSignIn()}
        >
          Sign in with Clerk
        </button>
      </div>

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
