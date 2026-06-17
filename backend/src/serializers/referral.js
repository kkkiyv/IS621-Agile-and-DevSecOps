const STATUS_LABELS = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  CASE_OPENED: "Case Opened",
  CLOSED: "Closed",
};

const RISK_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

function toTeacherReferral(row) {
  return {
    id: row.id,
    studentName: row.studentName,
    concern: row.concern,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCounsellorReferral(row) {
  return {
    id: row.id,
    studentName: row.studentName,
    concern: row.concern,
    description: row.description,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    riskLevel: row.riskLevel,
    riskLevelLabel: row.riskLevel ? RISK_LABELS[row.riskLevel] : null,
    triageNotes: row.triageNotes,
    triagedAt: row.triagedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedBy: row.submittedBy
      ? {
          id: row.submittedBy.id,
          email: row.submittedBy.email,
          name: row.submittedBy.name,
        }
      : undefined,
    triagedBy: row.triagedBy
      ? {
          id: row.triagedBy.id,
          name: row.triagedBy.name,
        }
      : undefined,
    caseId: row.Case?.id ?? null,
  };
}

const counsellorInclude = {
  submittedBy: { select: { id: true, email: true, name: true } },
  triagedBy: { select: { id: true, name: true } },
  Case: { select: { id: true } },
};

module.exports = {
  toTeacherReferral,
  toCounsellorReferral,
  STATUS_LABELS,
  RISK_LABELS,
  counsellorInclude,
};
