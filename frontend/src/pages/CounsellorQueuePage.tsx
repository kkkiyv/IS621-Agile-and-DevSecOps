import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import type { CounsellorReferral, QueueResponse, ReferralStatus } from "../types";
import { formatRelativeTime } from "../utils/format";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "CASE_OPENED", label: "Case Opened" },
  { value: "CLOSED", label: "Closed" },
];

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

export function CounsellorQueuePage() {
  const [referrals, setReferrals] = useState<CounsellorReferral[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (sort === "oldest") params.set("sort", "oldest");
    const qs = params.toString() ? `?${params.toString()}` : "";

    apiFetch<QueueResponse>(`/api/referrals/queue${qs}`)
      .then((data) => {
        setReferrals(data.referrals);
        setStatusCounts(data.statusCounts ?? {});
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [statusFilter, sort]);

  const filterLabel = useMemo(() => {
    return STATUS_OPTIONS.map((opt) => {
      const count =
        opt.value === ""
          ? statusCounts.ALL ?? referrals.length
          : statusCounts[opt.value as ReferralStatus] ?? 0;
      const suffix = opt.value === "" ? "All" : opt.label;
      return { ...opt, label: `${suffix} (${count})` };
    });
  }, [statusCounts, referrals.length]);

  return (
    <Layout counsellorNav>
      <div className="page-header">
        <div>
          <h1>Referral Queue</h1>
          <p className="page-subtitle">Triage and manage incoming referrals</p>
        </div>
      </div>

      <div className="queue-toolbar card">
        <label className="toolbar-field">
          <span>Filter by Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {filterLabel.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar-field">
          <span>Sort By</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          >
            <option value="newest">Date (Newest First)</option>
            <option value="oldest">Date (Oldest First)</option>
          </select>
        </label>
      </div>

      {loading && <p className="muted">Loading referrals…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && referrals.length === 0 && (
        <div className="card empty-state">
          <p>No referrals match this filter.</p>
        </div>
      )}

      <div className="referral-list">
        {referrals.map((r) => (
          <article key={r.id} className="referral-card card">
            <div className="referral-card-inner">
              <div className="referral-card-main">
                <div className="referral-card-title">
                  <h2>{r.studentName}</h2>
                  <span className={statusBadgeClass(r.status)}>
                    {r.statusLabel}
                  </span>
                  {r.riskLevelLabel && (
                    <span className={riskBadgeClass(r.riskLevel)}>
                      {r.riskLevelLabel}
                    </span>
                  )}
                </div>

                <dl className="referral-meta referral-meta--list">
                  <div><dt>Concern:</dt><dd>{r.concern}</dd></div>
                  <div><dt>Submitted by:</dt><dd>{r.submittedBy?.name ?? "—"}</dd></div>
                  <div><dt>Submitted:</dt><dd>{formatRelativeTime(r.createdAt)}</dd></div>
                </dl>

                <hr className="referral-divider" />

                <dl className="referral-description-section referral-description-section--card">
                  <dt>Description:</dt>
                  <dd>{r.description}</dd>
                </dl>

                {r.triageNotes && (
                  <>
                    <hr className="referral-divider" />
                    <dl className="referral-description-section referral-description-section--card">
                      <dt>Triage Notes:</dt>
                      <dd>{r.triageNotes}</dd>
                    </dl>
                  </>
                )}
                {r.triagedBy && r.triagedAt && (
                  <>
                    <hr className="referral-divider" />
                    <dl className="referral-meta referral-meta--list">
                      <div>
                        <dt>Triaged by:</dt>
                        <dd>{r.triagedBy.name} · {formatRelativeTime(r.triagedAt)}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>

              <Link
                to={`/counsellor/referrals/${r.id}`}
                className="btn btn-primary btn-sm"
              >
                View Details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}
