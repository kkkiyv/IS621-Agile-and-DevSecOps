import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import { redirectAfterLogin } from "../utils/authRedirect";

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const roles: { role: Role; title: string; description: string }[] = [
  { role: "TEACHER", title: "Teacher", description: "Submit and track referrals" },
  { role: "COUNSELLOR", title: "Counsellor", description: "Triage and manage cases" },
  { role: "LEAD_ADMIN", title: "Lead", description: "Dashboard & audit logs" },
];

export function LoginPage() {
  const { openSignIn } = useClerk();
  const { loginDemo, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
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

  return (
    <div className="lp-page">
      <div className="lp-brand">
        <div className="lp-brand-icon">
          <ShieldIcon />
        </div>
        <h1 className="lp-brand-title">CaseHub</h1>
        <p className="lp-brand-sub">Student Referral &amp; Case Management</p>
      </div>

      <div className="lp-card">
        <button type="button" className="lp-submit" disabled={busy} onClick={() => openSignIn()}>
          Sign in
        </button>

        <div className="lp-demo">
          <button
            type="button"
            className="lp-demo-toggle"
            disabled={busy}
            onClick={() => { setShowDemo((v) => !v); setError(null); }}
          >
            <span>Demo credentials</span>
            <span className="lp-demo-arrow">{showDemo ? "▲" : "▼"}</span>
          </button>
          {showDemo && (
            <div className="lp-demo-body">
              {error && <p className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</p>}
              <p className="lp-demo-hint">Select a role — no password required</p>
              <div className="lp-demo-roles">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    className="lp-demo-role"
                    disabled={busy}
                    onClick={() => handleDemoSelect(r.role)}
                  >
                    <span className="lp-demo-role-title">{r.title}</span>
                    <span className="lp-demo-role-desc">
                      {demoLoading === r.role ? "Signing in…" : r.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
