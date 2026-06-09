import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNow } from "../hooks/useNow";
import type { Case, CaseStatus, Note, SessionNote, SessionType, Task } from "../types";
import { formatRelativeTime } from "../utils/format";
import { isTaskOverdue, sortTasksForDisplay } from "../utils/taskOverdue";

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

function riskBadgeClass(level: string): string {
  if (level === "HIGH") return "badge badge--risk-high";
  if (level === "LOW") return "badge badge--risk-low";
  return "badge badge--risk-medium";
}

type CaseWithTasks = Case & { tasks: Task[]; notes: Note[] };

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("INDIVIDUAL");
  const [sessionDuration, setSessionDuration] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionSummary, setSessionSummary] = useState("");
  const [sessionObservations, setSessionObservations] = useState("");
  const [sessionNextSteps, setSessionNextSteps] = useState("");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const now = useNow();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<{ case: CaseWithTasks }>(`/api/cases/${id}`),
      apiFetch<{ sessionNotes: SessionNote[] }>(`/api/cases/${id}/sessions`),
    ])
      .then(([caseRes, sessionsRes]) => {
        setCaseData(caseRes.case);
        setSessionNotes(sessionsRes.sessionNotes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  function openForm() {
    setFormOpen(true);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskError(null);
  }

  async function handleCreateTask() {
    if (!taskTitle.trim() || !taskDueDate) return;
    setTaskSubmitting(true);
    setTaskError(null);
    try {
      const { task } = await apiFetch<{ task: Task }>(`/api/cases/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          dueDate: taskDueDate,
          assignedToId: user!.id,
        }),
      });
      setCaseData((prev) => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
      setFormOpen(false);
    } catch (e) {
      setTaskError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setTaskSubmitting(false);
    }
  }

  async function handleMarkComplete(taskId: string) {
    setCompleting(taskId);
    try {
      await apiFetch(`/api/cases/${id}/tasks/${taskId}/complete`, { method: "PATCH" });
      setCaseData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, completed: true, isOverdue: false } : t
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task");
    } finally {
      setCompleting(null);
    }
  }

  async function handleCreateNote() {
    if (!noteContent.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const { note } = await apiFetch<{ note: Note }>(`/api/cases/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      setCaseData((prev) => prev ? { ...prev, notes: [note, ...prev.notes] } : prev);
      setNoteContent("");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setNoteSubmitting(false);
    }
  }

  function openSessionForm() {
    setSessionFormOpen(true);
    setSessionType("INDIVIDUAL");
    setSessionDuration("");
    setSessionDate("");
    setSessionSummary("");
    setSessionObservations("");
    setSessionNextSteps("");
    setSessionError(null);
  }

  async function handleCreateSessionNote(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSessionSubmitting(true);
    setSessionError(null);
    try {
      const { sessionNote } = await apiFetch<{ sessionNote: SessionNote }>(
        `/api/cases/${id}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionType,
            duration: parseInt(sessionDuration, 10),
            sessionDate,
            summary: sessionSummary,
            observations: sessionObservations,
            nextSteps: sessionNextSteps,
          }),
        }
      );
      setSessionNotes((prev) => [sessionNote, ...prev]);
      setSessionFormOpen(false);
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Failed to save session note");
    } finally {
      setSessionSubmitting(false);
    }
  }

  async function handleCloseCase() {
    setClosing(true);
    try {
      await apiFetch(`/api/cases/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" as CaseStatus }),
      });
      navigate("/counsellor/cases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close case");
      setClosing(false);
    }
  }

  if (loading) return <Layout counsellorNav><p className="muted">Loading…</p></Layout>;
  if (error && !caseData) return <Layout counsellorNav><p className="form-error">{error}</p></Layout>;
  if (!caseData) return null;

  const isClosed = caseData.status === "CLOSED";
  const sortedTasks = sortTasksForDisplay(caseData.tasks, now);
  const overdueCount = sortedTasks.filter((t) => isTaskOverdue(t, now)).length;

  return (
    <Layout counsellorNav>
      <Link to="/counsellor/cases" className="back-link">← Back to Cases</Link>

      <div className="case-detail-cards">
        <div className="card detail-header">
          <div className="detail-title-row">
          <div className="referral-card-title">
            <h1>{caseData.referral.studentName}</h1>
            <span className={statusBadgeClass(caseData.status)}>
              {STATUS_LABELS[caseData.status]}
            </span>
            {caseData.referral.riskLevel && (
              <span className={riskBadgeClass(caseData.referral.riskLevel)}>
                {caseData.referral.riskLevel.charAt(0) + caseData.referral.riskLevel.slice(1).toLowerCase()}
              </span>
            )}
          </div>
          {!isClosed && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-end" }} disabled={closing} onClick={handleCloseCase}>
              {closing ? "Closing…" : "Close Case"}
            </button>
          )}
        </div>
        <p style={{ margin: "0.002rem 0 0.75rem", color: "var(--muted)", fontSize: "0.9rem" }}>Case ID: {caseData.id}</p>
        <dl className="referral-meta">
          <div>
            <dt>Assigned to</dt>
            <dd>{caseData.assignedTo.name}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatRelativeTime(caseData.createdAt)}</dd>
          </div>
        </dl>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="card" style={{ padding: "1.5rem" }}>
        <div className="case-tasks-header">
          <div className="case-tasks-title">
            <h3>Tasks</h3>
            {overdueCount > 0 && (
              <span className="badge badge--overdue" role="status">
                {overdueCount} overdue
              </span>
            )}
          </div>
          {!isClosed && !formOpen && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openForm}>
              + Add Task
            </button>
          )}
        </div>
        <hr className="referral-divider" />

        {formOpen && (
          <div className="task-form card">
            {taskError && <p className="form-error">{taskError}</p>}
            <div className="task-form-field">
              <label className="task-form-label">Task Title *</label>
              <input
                className="form-input"
                placeholder="Enter task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={taskSubmitting}
              />
            </div>
            <div className="task-form-field">
              <label className="task-form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="Optional description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                disabled={taskSubmitting}
                rows={4}
              />
            </div>
            <div className="task-form-field">
              <label className="task-form-label">Due Date *</label>
              <input
                className="form-input"
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                disabled={taskSubmitting}
              />
            </div>
            <div className="task-form-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={taskSubmitting || !taskTitle.trim() || !taskDueDate}
                onClick={handleCreateTask}
              >
                {taskSubmitting ? "Saving…" : "Create Task"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={taskSubmitting}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="task-list">
          {caseData.tasks.length === 0 && !formOpen && (
            <p className="muted" style={{ margin: 0, padding: 0 }}>No tasks yet.</p>
          )}
          {sortedTasks.map((t) => {
            const due = new Date(t.dueDate);
            const overdue = isTaskOverdue(t, now);
            return (
              <div
                key={t.id}
                className={`task-item${overdue ? " task-item--overdue" : ""}`}
                aria-label={overdue ? `${t.title}, overdue` : t.title}
              >
                <div className="task-item-main">
                  <span className={`task-icon${t.completed ? " task-icon--done" : overdue ? " task-icon--overdue" : ""}`}>
                    {t.completed ? (
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                    ) : overdue ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd"/></svg>
                    )}
                  </span>
                  <div className="task-item-body">
                    <div className="task-title-row">
                      <span className="task-title">{t.title}</span>
                      {overdue && (
                        <span className="badge badge--overdue badge--sm">Overdue</span>
                      )}
                    </div>
                    {t.description && <p className="task-description">{t.description}</p>}
                    <span className="task-meta">
                      Due: {due.toLocaleString()}
                      {overdue && <span className="task-overdue-label"> (Overdue)</span>}
                      {t.assignedTo && ` · Assigned to: ${t.assignedTo.name}`}
                    </span>
                  </div>
                </div>
                {!t.completed ? (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    disabled={completing === t.id}
                    onClick={() => handleMarkComplete(t.id)}
                  >
                    {completing === t.id ? "Saving…" : "Mark Complete"}
                  </button>
                ) : (
                  <span className="task-done-label">Done</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="case-tasks-header">
          <h3>Private Notes</h3>
        </div>
        <hr className="referral-divider" />

        <div className="note-form">
          {noteError && <p className="form-error">{noteError}</p>}
          <textarea
            className="form-input"
            placeholder="Add a confidential note…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            disabled={noteSubmitting}
            rows={3}
          />
          <div className="task-form-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={noteSubmitting || !noteContent.trim()}
              onClick={handleCreateNote}
            >
              {noteSubmitting ? "Saving…" : "Add Note"}
            </button>
          </div>
        </div>

        <div className="note-list">
          {caseData.notes.length === 0 && <p className="muted" style={{ margin: 0, padding: 0 }}>No notes yet.</p>}
          {caseData.notes.map((n) => (
            <div key={n.id} className="note-item">
              <div className="note-meta">
                <span className="note-author">{n.author.name}</span>
                <span className="note-date">{formatRelativeTime(n.createdAt)}</span>
              </div>
              <p className="note-content">{n.content}</p>
            </div>
          ))}
        </div>
        </div>

        {/* Session Notes card */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="case-tasks-header">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="14" x2="16" y2="14"/>
                <line x1="8" y1="18" x2="12" y2="18"/>
              </svg>
              Session Notes
            </h3>
            {!isClosed && !sessionFormOpen && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openSessionForm}>
                + New Session
              </button>
            )}
          </div>
          <hr className="referral-divider" />

          <div className="info-banner" style={{ marginTop: 0, marginBottom: "1rem" }}>
            Session notes are only visible to Counsellors and Leads
          </div>

          {sessionFormOpen && (
            <form onSubmit={handleCreateSessionNote} style={{ marginBottom: "1.25rem" }}>
              {sessionError && <p className="form-error">{sessionError}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Session Type <span className="required">*</span></span>
                  <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)} required>
                    <option value="INDIVIDUAL">Individual Session</option>
                    <option value="GROUP">Group Session</option>
                    <option value="FAMILY">Family Session</option>
                    <option value="CRISIS">Crisis Intervention</option>
                  </select>
                </label>
                <label className="field">
                  <span>Duration (minutes) <span className="required">*</span></span>
                  <input type="number" min={1} placeholder="e.g. 60" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} required />
                </label>
              </div>
              <label className="field">
                <span>Session Date & Time <span className="required">*</span></span>
                <input type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
              </label>
              <label className="field">
                <span>Summary <span className="required">*</span></span>
                <textarea rows={3} placeholder="Summarise the session…" value={sessionSummary} onChange={(e) => setSessionSummary(e.target.value)} required />
              </label>
              <label className="field">
                <span>Observations <span className="required">*</span></span>
                <textarea rows={3} placeholder="Key observations from the session…" value={sessionObservations} onChange={(e) => setSessionObservations(e.target.value)} required />
              </label>
              <label className="field">
                <span>Next Steps <span className="required">*</span></span>
                <textarea rows={3} placeholder="Planned follow-up actions…" value={sessionNextSteps} onChange={(e) => setSessionNextSteps(e.target.value)} required />
              </label>
              <div className="task-form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={sessionSubmitting}>
                  {sessionSubmitting ? "Saving…" : "Save Session Note"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSessionFormOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sessionNotes.length === 0 && !sessionFormOpen && (
            <p className="muted" style={{ margin: 0, padding: 0 }}>No session notes yet.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sessionNotes.map((note) => (
              <div key={note.id} className="session-note-card card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                  <span className="session-note-type">{note.sessionTypeLabel}</span>
                  <span className="badge session-note-duration">{note.duration} min</span>
                </div>
                <p className="session-note-date">
                  {new Date(note.sessionDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  {" · "}
                  {new Date(note.sessionDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
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
                <p className="session-note-meta">{note.author.name} · Documented {formatRelativeTime(note.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
