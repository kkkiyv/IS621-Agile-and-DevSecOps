import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import type { CounsellorReferral, RiskLevel } from "../types";
import { formatRelativeTime } from "../utils/format";

function statusBadgeClass(status: string): string {
  if (status === "IN_REVIEW") return "badge badge--review";
  if (status === "CASE_OPENED") return "badge badge--case";
  if (status === "CLOSED") return "badge badge--closed";
  return "badge badge--submitted";
}

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<CounsellorReferral | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");
  const [triageNotes, setTriageNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{ referral: CounsellorReferral }>(`/api/referrals/${id}`)
      .then((data) => {
        setReferral(data.referral);
        if (data.referral.riskLevel) setRiskLevel(data.referral.riskLevel);
        if (data.referral.triageNotes) setTriageNotes(data.referral.triageNotes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const canTriage = referral?.status === "SUBMITTED";

  const handleTriage = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !canTriage) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await apiFetch<{ referral: CounsellorReferral }>(
        `/api/referrals/${id}/triage`,
        {
          method: "PATCH",
          body: JSON.stringify({ riskLevel, triageNotes: triageNotes.trim() }),
        }
      );
      setReferral(data.referral);
      setSuccess("Referral triaged successfully.");
      setTimeout(() => navigate("/counsellor/queue"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout counsellorNav>
      <Link to="/counsellor/queue" className="back-link">
        ← Back to Referral Queue
      </Link>

      {loading && <p className="muted">Loading…</p>}
      {error && !referral && <p className="form-error">{error}</p>}

      {referral && (
        <>
          <div className="card detail-header">
            <div className="detail-title-row">
              <h1>{referral.studentName}</h1>
              <span className={statusBadgeClass(referral.status)}>
                {referral.statusLabel}
              </span>
              {referral.riskLevelLabel && (
                <span className="badge badge--risk-medium">
                  {referral.riskLevelLabel}
                </span>
              )}
            </div>
            <dl className="referral-meta">
              <div>
                <dt>Concern</dt>
                <dd>{referral.concern}</dd>
              </div>
              <div>
                <dt>Submitted by</dt>
                <dd>{referral.submittedBy?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatRelativeTime(referral.createdAt)}</dd>
              </div>
            </dl>
            <p className="referral-description">{referral.description}</p>
            {referral.triagedBy && referral.triagedAt && (
              <p className="triage-meta muted">
                Triaged by {referral.triagedBy.name}{" "}
                {formatRelativeTime(referral.triagedAt)}
              </p>
            )}
          </div>

          {canTriage ? (
            <form className="card form-card" onSubmit={handleTriage}>
              <h2>Triage referral</h2>
              <p className="page-subtitle">
                Assign risk level and notes before moving to in review.
              </p>
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              <label className="field">
                <span>
                  Risk level <span className="required">*</span>
                </span>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>

              <label className="field">
                <span>Triage notes</span>
                <textarea
                  rows={4}
                  maxLength={200}
                  placeholder="e.g. Will create case and monitor academic progress closely."
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                />
                <span className="field-hint">
                  {triageNotes.length}/200 characters (text only)
                </span>
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/counsellor/queue")}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save triage"}
                </button>
              </div>
            </form>
          ) : (
            <div className="card form-card">
              <h2>Triage complete</h2>
              {referral.triageNotes && (
                <div className="triage-notes-box">
                  <strong>Triage Notes:</strong> {referral.triageNotes}
                </div>
              )}
              <p className="muted">
                This referral is already in review or closed. Further case
                management will be available in a later sprint.
              </p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
