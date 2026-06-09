const { prisma } = require("../prisma");

const ACTION_LABELS = {
  REFERRAL_CREATED: "Referral Created",
  REFERRAL_TRIAGED: "Referral Triaged",
  CASE_CREATED: "Case Created",
  NOTE_CREATED: "Note Created",
  TASK_CREATED: "Task Created",
  SESSION_NOTE_CREATED: "Session Note Created",
};

function userLabel(user) {
  const roleSlug = user.role.toLowerCase().replace("lead_admin", "lead").replace("_", "-");
  const shortId = user.email.split("@")[0].split("+").pop() || user.id.slice(-6);
  return `${user.name}, ${roleSlug}-${shortId}`;
}

function displayRecordId(recordType, recordId) {
  const prefix =
    recordType === "referral"
      ? "ref"
      : recordType === "case"
        ? "case"
        : recordType === "note"
          ? "note"
          : recordType === "task"
            ? "task"
            : recordType;
  return `${prefix}-${recordId.slice(-6)}`;
}

async function recordAuditLog({ userId, action, details, recordId, recordType }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, details, recordId, recordType },
    });
  } catch (err) {
    console.error("[audit] failed to record:", err.message);
  }
}

function serializeAuditLog(row) {
  return {
    id: row.id,
    action: row.action,
    actionLabel: ACTION_LABELS[row.action] || row.action,
    timestamp: row.createdAt,
    user: {
      id: row.user.id,
      name: row.user.name,
      role: row.user.role,
      label: userLabel(row.user),
    },
    details: row.details,
    recordId: row.recordId,
    recordType: row.recordType,
    displayRecordId: displayRecordId(row.recordType, row.recordId),
  };
}

module.exports = {
  ACTION_LABELS,
  recordAuditLog,
  serializeAuditLog,
  userLabel,
  displayRecordId,
};
