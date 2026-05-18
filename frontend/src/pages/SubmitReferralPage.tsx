import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { Layout } from "../components/Layout";
import { CONCERN_CATEGORIES } from "../utils/format";

export function SubmitReferralPage() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [concern, setConcern] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (description.trim().length < 20) {
      setError("Description must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/referrals", {
        method: "POST",
        body: JSON.stringify({
          studentName: studentName.trim(),
          concern,
          description: description.trim(),
        }),
      });
      navigate("/teacher/referrals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout teacherNav>
      <div className="page-header">
        <div>
          <h1>Submit Referral</h1>
          <p className="page-subtitle">
            Submit a referral for a student who may need additional support.
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}

        <label className="field">
          <span>
            Student Name <span className="required">*</span>
          </span>
          <input
            type="text"
            placeholder="Enter student's full name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            maxLength={50}
            required
          />
        </label>

        <label className="field">
          <span>
            Concern Category <span className="required">*</span>
          </span>
          <select
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            required
          >
            <option value="">Select a concern category</option>
            {CONCERN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>
            Description <span className="required">*</span>
          </span>
          <textarea
            rows={6}
            placeholder="Provide details about the concern, including specific behaviors, incidents, or patterns you've observed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <span className="field-hint">
            {description.length} characters (minimum 20 required)
          </span>
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/teacher/referrals")}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Referral"}
          </button>
        </div>
      </form>
    </Layout>
  );
}
