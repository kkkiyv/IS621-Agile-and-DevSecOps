import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import { useNow } from "../hooks/useNow";
import type { CaseStatus, DashboardSummary, RiskLevel } from "../types";

const RISK_COLORS: Record<RiskLevel, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

function riskPieGradient(counts: Record<RiskLevel, number>): string {
  const total = counts.HIGH + counts.MEDIUM + counts.LOW;
  if (total === 0) return "conic-gradient(#e5e7eb 0deg 360deg)";

  let angle = 0;
  const slices: string[] = [];
  for (const level of ["HIGH", "MEDIUM", "LOW"] as RiskLevel[]) {
    const slice = (counts[level] / total) * 360;
    if (slice > 0) {
      slices.push(`${RISK_COLORS[level]} ${angle}deg ${angle + slice}deg`);
      angle += slice;
    }
  }
  return `conic-gradient(${slices.join(", ")})`;
}

function maxCaseStatus(counts: Record<CaseStatus, number>): number {
  return Math.max(counts.OPEN, counts.IN_PROGRESS, counts.CLOSED, 1);
}

export function LeadPlaceholderPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  const loadDashboard = useCallback(() => {
    setError(null);
    apiFetch<DashboardSummary>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, now]);

  const metrics = data?.metrics;
  const barMax = data ? maxCaseStatus(data.casesByStatus) : 1;

  return (
    <Layout counsellorNav>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">System-wide overview and metrics</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setLoading(true);
            loadDashboard();
          }}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading && !data && <p className="muted">Loading dashboard…</p>}

      {data && metrics && (
        <>
          <div className="dash-kpi-grid">
            <div className="card dash-kpi-card">
              <div className="dash-kpi-icon dash-kpi-icon--blue" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <div>
                <span className="dash-kpi-label">Total Referrals</span>
                <span className="dash-kpi-value">{metrics.totalReferrals}</span>
              </div>
            </div>
            <div className="card dash-kpi-card">
              <div className="dash-kpi-icon dash-kpi-icon--green" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <div>
                <span className="dash-kpi-label">Active Cases</span>
                <span className="dash-kpi-value">{metrics.activeCases}</span>
              </div>
            </div>
            <div className="card dash-kpi-card">
              <div className="dash-kpi-icon dash-kpi-icon--red" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <span className="dash-kpi-label">Overdue Tasks</span>
                <span className="dash-kpi-value dash-kpi-value--alert">{metrics.overdueTasks}</span>
              </div>
            </div>
            <div className="card dash-kpi-card">
              <div className="dash-kpi-icon dash-kpi-icon--amber" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <span className="dash-kpi-label">Open Tasks</span>
                <span className="dash-kpi-value">{metrics.openTasks}</span>
              </div>
            </div>
          </div>

          <div className="dash-charts-grid">
            <section className="card dash-chart-card">
              <h3>Referrals by Risk Level</h3>
              <div className="dash-pie-wrap">
                <div
                  className="dash-pie"
                  style={{ background: riskPieGradient(data.referralsByRisk) }}
                  role="img"
                  aria-label="Referrals by risk level pie chart"
                />
                <ul className="dash-pie-legend">
                  {(["HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((level) => (
                    <li key={level}>
                      <span
                        className="dash-legend-dot"
                        style={{ background: RISK_COLORS[level] }}
                      />
                      {RISK_LABELS[level]}: {data.referralsByRisk[level]}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="card dash-chart-card">
              <h3>Cases by Status</h3>
              <div className="dash-bar-chart">
                {(["OPEN", "IN_PROGRESS", "CLOSED"] as CaseStatus[]).map((status) => (
                  <div key={status} className="dash-bar-col">
                    <div className="dash-bar-track">
                      <div
                        className="dash-bar-fill"
                        style={{
                          height: `${(data.casesByStatus[status] / barMax) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="dash-bar-label">{STATUS_LABELS[status]}</span>
                    <span className="dash-bar-count">{data.casesByStatus[status]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="dash-lists-grid">
            <section className="card dash-list-card">
              <h3>
                <span className="dash-list-icon dash-list-icon--red" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                Overdue Tasks ({data.overdueTasks.length})
              </h3>
              {data.overdueTasks.length === 0 ? (
                <p className="muted">No overdue tasks.</p>
              ) : (
                <ul className="dash-task-list">
                  {data.overdueTasks.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/counsellor/cases/${t.caseId}`}
                        className="dash-task-item dash-task-item--overdue"
                      >
                        <div>
                          <strong>{t.title}</strong>
                          <span className="muted">
                            {t.studentName} · {t.assignedToName}
                          </span>
                        </div>
                        <span className="badge badge--overdue">Overdue</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card dash-list-card">
              <h3>
                <span className="dash-list-icon dash-list-icon--amber" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                High &amp; Medium Risk Cases
              </h3>
              {data.riskCases.length === 0 ? (
                <p className="muted">No high or medium risk cases.</p>
              ) : (
                <ul className="dash-task-list">
                  {data.riskCases.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/counsellor/cases/${c.id}`}
                        className={`dash-task-item dash-task-item--risk dash-task-item--risk-${c.riskLevel.toLowerCase()}`}
                      >
                        <div>
                          <strong>{c.studentName}</strong>
                          <span className="muted">
                            {c.assignedToName} · {c.openTaskCount} open task
                            {c.openTaskCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        <span className={`badge badge--risk-${c.riskLevel.toLowerCase()}`}>
                          {RISK_LABELS[c.riskLevel]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </Layout>
  );
}
