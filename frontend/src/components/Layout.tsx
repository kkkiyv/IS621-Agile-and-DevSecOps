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
}: {
  children: React.ReactNode;
  teacherNav?: boolean;
  counsellorNav?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
              <NavLink
                to="/counsellor/queue"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab--active" : ""}`
                }
              >
                Referral Queue
              </NavLink>
              <span className="nav-tab nav-tab--disabled">Cases</span>
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
