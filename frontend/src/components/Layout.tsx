import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleLabels: Record<string, string> = {
  TEACHER: "Teacher",
  COUNSELLOR: "Counsellor",
  LEAD_ADMIN: "Lead",
};

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IconQueue = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M16 2v4M8 2v4M2 10h20"/>
  </svg>
);
const IconCases = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);
const IconAudit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export function Layout({
  children,
  teacherNav = false,
  counsellorNav = false,
  leadNav = false,
}: {
  children: React.ReactNode;
  teacherNav?: boolean;
  counsellorNav?: boolean;
  leadNav?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showLeadNav = leadNav || user?.role === "LEAD_ADMIN";

  const homeRoute = teacherNav
    ? "/teacher/submit"
    : showLeadNav
      ? "/lead"
      : "/counsellor/queue";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="brand" onClick={() => navigate(homeRoute)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            CaseHub
          </button>
          {teacherNav && (
            <nav className="nav-tabs">
              <NavLink to="/teacher/submit" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                <IconQueue /> Submit Referral
              </NavLink>
              <NavLink to="/teacher/referrals" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                <IconCases /> My Referrals
              </NavLink>
            </nav>
          )}
          {counsellorNav && (
            <nav className="nav-tabs">
              {showLeadNav && (
                <NavLink to="/lead" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                  <IconDashboard /> Dashboard
                </NavLink>
              )}
              <NavLink to="/counsellor/queue" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                <IconQueue /> Referral Queue
              </NavLink>
              <NavLink to="/counsellor/cases" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                <IconCases /> Cases
              </NavLink>
              {showLeadNav && (
                <NavLink to="/lead/audit-logs" className={({ isActive }) => `nav-tab${isActive ? " nav-tab--active" : ""}`}>
                  <IconAudit /> Audit Logs
                </NavLink>
              )}
            </nav>
          )}
          <div className="user-menu">
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">
                {user ? roleLabels[user.role] : ""}
              </span>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={handleLogout}>
              <IconLogout /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
