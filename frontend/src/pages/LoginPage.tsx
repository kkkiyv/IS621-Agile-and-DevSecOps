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

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

  const [showPassword, setShowPassword] = useState(false);
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
        <div className="lp-steps">
          <div className="lp-step lp-step--active">
            <span className="lp-step-dot">1</span>
            <span className="lp-step-label">Sign in</span>
          </div>
          <div className="lp-step-line" />
          <div className="lp-step">
            <span className="lp-step-dot">2</span>
            <span className="lp-step-label">Verify</span>
          </div>
          <div className="lp-step-line" />
          <div className="lp-step">
            <span className="lp-step-dot">3</span>
            <span className="lp-step-label">Access</span>
          </div>
        </div>

        <div className="lp-field">
          <label className="lp-label">Email address</label>
          <div className="lp-input-wrap">
            <span className="lp-input-icon"><EmailIcon /></span>
            <input type="email" className="lp-input" placeholder="you@school.edu" disabled={busy} />
          </div>
        </div>

        <div className="lp-field">
          <div className="lp-label-row">
            <label className="lp-label">Password</label>
            <button type="button" className="lp-forgot">Forgot password?</button>
          </div>
          <div className="lp-input-wrap">
            <span className="lp-input-icon"><LockIcon /></span>
            <input
              type={showPassword ? "text" : "password"}
              className="lp-input"
              placeholder="••••••••"
              disabled={busy}
            />
            <button type="button" className="lp-eye" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button type="button" className="lp-submit" disabled={busy} onClick={() => openSignIn()}>
          Sign in
        </button>

        <div className="lp-or"><span>or</span></div>

        <button type="button" className="lp-google" disabled={busy} onClick={() => openSignIn()}>
          <GoogleIcon />
          Sign in with Google
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
