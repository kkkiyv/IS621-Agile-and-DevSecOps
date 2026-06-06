import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import type { Case, RiskLevel } from "../types";
import { formatRelativeTime } from "../utils/format";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

function statusBadgeClass(status: string): string {
  if (status === "IN_PROGRESS") return "badge badge--review";
  if (status === "CLOSED") return "badge badge--closed";
  return "badge badge--submitted";
}

function riskBadgeClass(level?: RiskLevel | null): string {
  if (level === "HIGH") return "badge badge--risk-high";
  if (level === "LOW") return "badge badge--risk-low";
  return "badge badge--risk-medium";
}

const RISK_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ cases: Case[] }>("/api/cases")
      .then((data) => setCases(data.cases))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout counsellorNav>
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p className="page-subtitle">All open and active student cases</p>
        </div>
      </div>

      {loading && <p className="muted">Loading cases…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && cases.length === 0 && (
        <div className="card empty-state">
          <p>No cases yet. Open a case from a triaged referral.</p>
        </div>
      )}

      <div className="referral-list">
        {cases.map((c) => (
          <article key={c.id} className="referral-card card">
            <div className="referral-card-header">
              <div className="referral-card-title">
                <h2>{c.referral.studentName}</h2>
                <span className={statusBadgeClass(c.status)}>
                  {STATUS_LABELS[c.status]}
                </span>
                {c.referral.riskLevel && (
                  <span className={riskBadgeClass(c.referral.riskLevel)}>
                    {RISK_LABELS[c.referral.riskLevel]}
                  </span>
                )}
              </div>
              <div className="case-card-actions">
                <Link
                  to={`/counsellor/referrals/${c.referral.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  View Referral
                </Link>
                <Link
                  to={`/counsellor/cases/${c.id}`}
                  className="btn btn-primary btn-sm"
                >
                  View Case
                </Link>
              </div>
            </div>

            <dl className="referral-meta">
              <div>
                <dt>Concern</dt>
                <dd>{c.referral.concern}</dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{c.assignedTo.name}</dd>
              </div>
              <div>
                <dt>Opened</dt>
                <dd>{formatRelativeTime(c.createdAt)}</dd>
              </div>
            </dl>

            {c.referral.triageNotes && (
              <div className="triage-notes-box">
                <strong>Triage Notes:</strong> {c.referral.triageNotes}
              </div>
            )}
          </article>
        ))}
      </div>
    </Layout>
  );
}
