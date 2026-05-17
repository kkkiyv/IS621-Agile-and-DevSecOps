/** CH-002: teacher-visible shape — never expose triage fields. */
function toTeacherReferral(row) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status,
    studentName: row.studentName,
    nric: row.nric,
    description: row.description,
    category: row.category,
    urgency: row.urgency,
  };
}

/** CH-003: counsellor queue — operational view incl. triage. */
function toCounsellorReferral(row) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status,
    studentName: row.studentName,
    nric: row.nric,
    description: row.description,
    category: row.category,
    urgency: row.urgency,
    submittedBy: row.submittedBy
      ? { id: row.submittedBy.id, email: row.submittedBy.email }
      : undefined,
    triageRiskLevel: row.triageRiskLevel,
    triageOutcome: row.triageOutcome,
  };
}

module.exports = { toTeacherReferral, toCounsellorReferral };
