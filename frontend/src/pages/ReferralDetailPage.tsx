import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { CounsellorOption, CounsellorReferral, RiskLevel } from "../types";
import { formatRelativeTime } from "../utils/format";

function statusBadgeClass(status: string): string {
  if (status === "IN_REVIEW") return "badge badge--review";
  if (status === "CASE_OPENED") return "badge badge--case";
  if (status === "CLOSED") return "badge badge--closed";
  return "badge badge--submitted";
}

function riskBadgeClass(level?: string | null): string {
  if (level === "HIGH") return "badge badge--risk-high";
  if (level === "LOW") return "badge badge--risk-low";
  return "badge badge--risk-medium";
}

function OwnerSelect({
  counsellors,
  value,
  onChange,
}: {
  counsellors: CounsellorOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="field">
      <span>
        Case Owner <span className="required">*</span>
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          Select counsellor
        </option>
        {counsellors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.email})
          </option>
        ))}
      </select>
      <span className="field-hint">
        Assign accountability before the case is created.
      </span>
    </label>
  );
}

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referral, setReferral] = useState<CounsellorReferral | null>(null);
  const [counsellors, setCounsellors] = useState<CounsellorOption[]>([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");
  const [triageNotes, setTriageNotes] = useState("");
  const [outcome, setOutcome] = useState<"OPEN_CASE" | "CLOSE" | "">("");
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

  useEffect(() => {
    apiFetch<{ counsellors: CounsellorOption[] }>("/api/users/counsellors")
      .then((data) => {
        setCounsellors(data.counsellors);
        if (user?.role === "COUNSELLOR" && data.counsellors.some((c) => c.id === user.id)) {
          setAssignedToId(user.id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load counsellors"));
  }, [user]);

  const canTriage = referral?.status === "SUBMITTED";
  const canOpenCase = referral?.status === "IN_REVIEW";

  const handleOpenCase = async () => {
    if (!id || !assignedToId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await apiFetch("/api/cases", {
        method: "POST",
        body: JSON.stringify({ referralId: id, assignedToId }),
      });
      setSuccess("Case opened successfully.");
      setReferral((prev) =>
        prev ? { ...prev, status: "CASE_OPENED", statusLabel: "Converted to Case" } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open case");
    } finally {
      setSaving(false);
    }
  };

  const handleTriage = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !canTriage || !outcome) return;
    if (outcome === "OPEN_CASE" && !assignedToId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await apiFetch<{ referral: CounsellorReferral }>(
        `/api/referrals/${id}/triage`,
        {
          method: "PATCH",
          body: JSON.stringify({ riskLevel, triageNotes: triageNotes.trim(), outcome }),
        }
      );
      if (outcome === "OPEN_CASE") {
        await apiFetch("/api/cases", {
          method: "POST",
          body: JSON.stringify({ referralId: id, assignedToId }),
        });
      }
      setReferral(data.referral);
      setSuccess("Triage complete.");
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
        <div className="case-detail-cards">
          <div className="card detail-header">
            <div className="referral-card-title" style={{ marginBottom: "0rem" }}>
              <h1>{referral.studentName}</h1>
              <span className={statusBadgeClass(referral.status)}>
                {referral.statusLabel}
              </span>
              {referral.riskLevelLabel && (
                <span className={riskBadgeClass(referral.riskLevel)}>
                  {referral.riskLevelLabel}
                </span>
              )}
            </div>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.8rem" }}>
              Referral ID: {referral.id}
            </p>
            <dl className="referral-meta referral-meta--2col">
              <div>
                <dt>Concern Category</dt>
                <dd>{referral.concern}</dd>
              </div>
              <div>
                <dt>Submitted By</dt>
                <dd>{referral.submittedBy?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatRelativeTime(referral.createdAt)}</dd>
              </div>
              <div>
                <dt>Last Updated</dt>
                <dd>{formatRelativeTime(referral.updatedAt)}</dd>
              </div>
            </dl>
            <hr className="referral-divider" />
            <div className="referral-description-section">
              <dt>Description</dt>
              <dd>{referral.description}</dd>
            </div>
          </div>

          {canTriage ? (
            <form className="card form-card" onSubmit={handleTriage}>
              <h3>Triage Referral</h3>
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              <div className="field">
                <span>
                  Risk Level <span className="required">*</span>
                </span>
                <div className="risk-toggle-group">
                  {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`risk-toggle-btn${riskLevel === level ? " risk-toggle-btn--active" : ""}`}
                      onClick={() => setRiskLevel(level)}
                    >
                      {level.charAt(0) + level.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>
                  Outcome <span className="required">*</span>
                </span>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as "OPEN_CASE" | "CLOSE")}
                  required
                >
                  <option value="" disabled>Select outcome</option>
                  <option value="OPEN_CASE">Open Case</option>
                  <option value="CLOSE">Close</option>
                </select>
              </label>

              {outcome === "OPEN_CASE" && (
                <OwnerSelect
                  counsellors={counsellors}
                  value={assignedToId}
                  onChange={setAssignedToId}
                />
              )}

              <label className="field">
                <span>
                  Triage Notes <span className="required">*</span>
                </span>
                <textarea
                  rows={4}
                  maxLength={2000}
                  placeholder="Document your assessment, planned interventions, and rationale for the outcome..."
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  required
                />
                <span className="field-hint">{triageNotes.length} characters</span>
              </label>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !outcome || (outcome === "OPEN_CASE" && !assignedToId)}
                >
                  {saving ? "Saving…" : "Complete Triage"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate("/counsellor/queue")}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="card form-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Triage complete</h3>
                {!canOpenCase && referral.caseId && (
                  <Link to={`/counsellor/cases/${referral.caseId}`} className="btn btn-primary btn-sm">
                    View Case
                  </Link>
                )}
              </div>
              {canOpenCase && (
                <>
                  <OwnerSelect
                    counsellors={counsellors}
                    value={assignedToId}
                    onChange={setAssignedToId}
                  />
                  <div className="form-actions" style={{ marginTop: "1rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={saving || !assignedToId}
                      onClick={handleOpenCase}
                    >
                      {saving ? "Opening…" : "Open Case"}
                    </button>
                  </div>
                </>
              )}
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}
              {!canOpenCase && (
                <>
                  <hr className="referral-divider" />
                  {referral.triageNotes && (
                    <>
                      <dl className="referral-description-section referral-description-section--card">
                        <dt>Triage Notes:</dt>
                        <dd>{referral.triageNotes}</dd>
                      </dl>
                      <hr className="referral-divider" />
                    </>
                  )}
                  <p className="muted" style={{ margin: 0, padding: 0 }}>
                    {referral.status === "CASE_OPENED"
                      ? "A case has been opened for this referral."
                      : "This referral is closed."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
