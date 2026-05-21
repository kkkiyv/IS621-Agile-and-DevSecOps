import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SubmitReferralPage } from "./pages/SubmitReferralPage";
import { MyReferralsPage } from "./pages/MyReferralsPage";
import { CounsellorQueuePage } from "./pages/CounsellorQueuePage";
import { ReferralDetailPage } from "./pages/ReferralDetailPage";
import { LeadPlaceholderPage } from "./pages/LeadPlaceholderPage";
import { CasesPage } from "./pages/CasesPage";
import type { Role } from "./types";

function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/teacher/submit"
        element={
          <RequireAuth roles={["TEACHER"]}>
            <SubmitReferralPage />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/referrals"
        element={
          <RequireAuth roles={["TEACHER"]}>
            <MyReferralsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/counsellor/queue"
        element={
          <RequireAuth roles={["COUNSELLOR", "LEAD_ADMIN"]}>
            <CounsellorQueuePage />
          </RequireAuth>
        }
      />
      <Route
        path="/counsellor/referrals/:id"
        element={
          <RequireAuth roles={["COUNSELLOR", "LEAD_ADMIN"]}>
            <ReferralDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/counsellor/cases"
        element={
          <RequireAuth roles={["COUNSELLOR", "LEAD_ADMIN"]}>
            <CasesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lead"
        element={
          <RequireAuth roles={["LEAD_ADMIN"]}>
            <LeadPlaceholderPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
