import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleLabels: Record<string, string> = {
  TEACHER: "Teacher",
  COUNSELLOR: "Counsellor",
  LEAD_ADMIN: "Lead",
};

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">Student Support Portal</div>
          {teacherNav && (
            <nav className="nav-tabs">
              <NavLink
                to="/teacher/submit"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab--active" : ""}`
                }
              >
                Submit Referral
              </NavLink>
              <NavLink
                to="/teacher/referrals"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab--active" : ""}`
                }
              >
                My Referrals
              </NavLink>
            </nav>
          )}
          {counsellorNav && (
            <nav className="nav-tabs">
              {showLeadNav && (
                <NavLink
                  to="/lead"
                  className={({ isActive }) =>
                    `nav-tab${isActive ? " nav-tab--active" : ""}`
                  }
                >
                  Dashboard
                </NavLink>
              )}
              <NavLink
                to="/counsellor/queue"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab--active" : ""}`
                }
              >
                Referral Queue
              </NavLink>
              <NavLink
                to="/counsellor/cases"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab--active" : ""}`
                }
              >
                Cases
              </NavLink>
              {showLeadNav && (
                <NavLink
                  to="/lead/audit-logs"
                  className={({ isActive }) =>
                    `nav-tab${isActive ? " nav-tab--active" : ""}`
                  }
                >
                  Audit Logs
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
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
