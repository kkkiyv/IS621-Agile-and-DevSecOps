import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Layout } from "../components/Layout";
import type { TeacherReferral } from "../types";
import { formatRelativeTime } from "../utils/format";

function statusClass(status: string): string {
  if (status === "IN_REVIEW") return "badge badge--review";
  if (status === "CLOSED") return "badge badge--closed";
  return "badge badge--submitted";
}

export function MyReferralsPage() {
  const [referrals, setReferrals] = useState<TeacherReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ referrals: TeacherReferral[] }>("/api/referrals/me")
      .then((data) => setReferrals(data.referrals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout teacherNav>
      <div className="page-header">
        <div>
          <h1>My Referrals</h1>
          <p className="page-subtitle">
            View the status of your submitted referrals
          </p>
        </div>
        <Link to="/teacher/submit" className="btn btn-primary">
          + New Referral
        </Link>
      </div>

      <div className="card table-card">
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="form-error">{error}</p>}
        {!loading && !error && referrals.length === 0 && (
          <p className="muted">No referrals yet. Create your first referral.</p>
        )}
        {!loading && referrals.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Concern</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td>{r.studentName}</td>
                  <td>{r.concern}</td>
                  <td>
                    <span className={statusClass(r.status)}>
                      {r.statusLabel}
                    </span>
                  </td>
                  <td className="muted">{formatRelativeTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="info-banner">
        <strong>Note:</strong> For privacy reasons, teachers can only view the
        status of their referrals. Detailed triage information and case notes
        are restricted to counselling staff.
      </div>
    </Layout>
  );
}
