import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import type { SessionNote, SessionType } from "../types";
import { formatRelativeTime } from "../utils/format";

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual Session" },
  { value: "GROUP", label: "Group Session" },
  { value: "FAMILY", label: "Family Session" },
  { value: "CRISIS", label: "Crisis Intervention" },
];

export function SessionNotesPage() {
  const { id: caseId } = useParams<{ id: string }>();

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("INDIVIDUAL");
  const [duration, setDuration] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [summary, setSummary] = useState("");
  const [observations, setObservations] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    apiFetch<{ sessionNotes: SessionNote[] }>(`/api/cases/${caseId}/sessions`)
      .then((data) => setNotes(data.sessionNotes))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [caseId]);

  function openForm() {
    setFormOpen(true);
    setSessionType("INDIVIDUAL");
    setDuration("");
    setSessionDate("");
    setSummary("");
    setObservations("");
    setNextSteps("");
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!caseId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const { sessionNote } = await apiFetch<{ sessionNote: SessionNote }>(
        `/api/cases/${caseId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionType,
            duration: parseInt(duration, 10),
            sessionDate,
            summary,
            observations,
            nextSteps,
          }),
        }
      );
      setNotes((prev) => [sessionNote, ...prev]);
      setFormOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout counsellorNav>
      <Link to={`/counsellor/cases/${caseId}`} className="back-link">
        ← Back to Case
      </Link>

      <div className="page-header">
        <div>
          <h1 className="session-notes-title">
            <span className="session-notes-icon">📋</span> Session Notes
          </h1>
          <p className="page-subtitle">Structured documentation of counseling sessions</p>
        </div>
        {!formOpen && (
          <button type="button" className="btn btn-primary" onClick={openForm}>
            + New Session
          </button>
        )}
      </div>

      <div className="info-banner" style={{ marginBottom: "1.25rem" }}>
        Session notes are only visible to Counsellors and Leads
      </div>

      {formOpen && (
        <form className="card form-card" style={{ maxWidth: "none", marginBottom: "1.25rem" }} onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 1rem" }}>New Session Note</h3>
          {formError && <p className="form-error">{formError}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label className="field">
              <span>Session Type <span className="required">*</span></span>
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} required>
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Duration (minutes) <span className="required">*</span></span>
              <input
                type="number"
                min={1}
                placeholder="e.g. 60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Session Date & Time <span className="required">*</span></span>
            <input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Summary <span className="required">*</span></span>
            <textarea rows={3} placeholder="Summarise the session..." value={summary} onChange={(e) => setSummary(e.target.value)} required />
          </label>

          <label className="field">
            <span>Observations <span className="required">*</span></span>
            <textarea rows={3} placeholder="Key observations from the session..." value={observations} onChange={(e) => setObservations(e.target.value)} required />
          </label>

          <label className="field">
            <span>Next Steps <span className="required">*</span></span>
            <textarea rows={3} placeholder="Planned follow-up actions..." value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} required />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save Session Note"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="muted" style={{ padding: 0 }}>Loading…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && notes.length === 0 && !formOpen && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <p className="muted" style={{ margin: 0, padding: 0 }}>No session notes yet.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {notes.map((note) => (
          <div key={note.id} className="card session-note-card">
            <div className="session-note-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className="session-note-type">{note.sessionTypeLabel}</span>
                  <span className="badge session-note-duration">{note.duration} min</span>
                </div>
                <p className="session-note-date">
                  {new Date(note.sessionDate).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}{" "}
                  ·{" "}
                  {new Date(note.sessionDate).toLocaleTimeString("en-US", {
                    hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <hr className="referral-divider" />

            <div className="session-note-fields">
              <div className="session-note-field">
                <span className="session-note-field-label">Summary</span>
                <div className="session-note-field-value">{note.summary}</div>
              </div>
              <div className="session-note-field">
                <span className="session-note-field-label">Observations</span>
                <div className="session-note-field-value">{note.observations}</div>
              </div>
              <div className="session-note-field">
                <span className="session-note-field-label">Next Steps</span>
                <div className="session-note-field-value">{note.nextSteps}</div>
              </div>
            </div>

            <hr className="referral-divider" />

            <p className="session-note-meta">
              {note.author.name} · Documented {formatRelativeTime(note.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
