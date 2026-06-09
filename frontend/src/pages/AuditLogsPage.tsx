import { useCallback, useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import type { AuditLogEntry } from "../types";

const ACTION_BADGE_CLASS: Record<string, string> = {
  REFERRAL_CREATED: "audit-badge audit-badge--referral",
  REFERRAL_TRIAGED: "audit-badge audit-badge--triage",
  CASE_CREATED: "audit-badge audit-badge--case",
  NOTE_CREATED: "audit-badge audit-badge--note",
  TASK_CREATED: "audit-badge audit-badge--task",
  SESSION_NOTE_CREATED: "audit-badge audit-badge--session",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ logs: AuditLogEntry[] }>("/api/audit-logs")
      .then((data) => setLogs(data.logs))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <Layout counsellorNav>
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="page-subtitle">
            Immutable log of all key system actions
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadLogs}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {!loading && !error && logs.length === 0 && (
        <div className="card empty-state">
          <p>No audit entries yet. Sensitive actions will appear here automatically.</p>
        </div>
      )}

      {!error && logs.length > 0 && (
        <div className="card audit-table-card">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Details</th>
                <th>Record ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td className="audit-timestamp">{formatTimestamp(entry.timestamp)}</td>
                  <td>
                    <span className={ACTION_BADGE_CLASS[entry.action] ?? "audit-badge"}>
                      {entry.actionLabel}
                    </span>
                  </td>
                  <td>{entry.user.label}</td>
                  <td>{entry.details}</td>
                  <td>
                    <code className="audit-record-id">{entry.displayRecordId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="info-banner audit-properties">
        <strong>Audit Log Properties</strong>
        <ul>
          <li><strong>Immutable:</strong> Logs cannot be edited or deleted</li>
          <li><strong>Complete:</strong> All key actions are automatically logged</li>
          <li><strong>Traceable:</strong> Each log includes user attribution and timestamp</li>
          <li><strong>Access Restricted:</strong> Only visible to Leads and Admins</li>
        </ul>
      </div>
    </Layout>
  );
}
