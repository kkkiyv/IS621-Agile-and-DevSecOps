const { serializeAuditLog, userLabel, displayRecordId } = require("../../src/services/audit.service");

// ── Test 12: Audit log formatting ─────────────────────────────────────────────

describe("Audit Log Formatting", () => {
  const mockRow = {
    id: "log-abc-123",
    action: "REFERRAL_CREATED",
    details: "Referral submitted for student Alice Tan",
    recordId: "ref-xyz-999888",
    recordType: "referral",
    createdAt: "2026-06-14T10:00:00Z",
    user: {
      id: "user-001",
      name: "Mr Smith",
      role: "TEACHER",
      email: "mrsmith@school.edu",
    },
  };

  test("Test 12: serialized audit log includes all required fields", () => {
    const result = serializeAuditLog(mockRow);

    expect(result).toHaveProperty("id", mockRow.id);
    expect(result).toHaveProperty("action", "REFERRAL_CREATED");
    expect(result).toHaveProperty("actionLabel", "Referral Created");
    expect(result).toHaveProperty("timestamp", mockRow.createdAt);
    expect(result).toHaveProperty("details", mockRow.details);
    expect(result).toHaveProperty("recordId", mockRow.recordId);
    expect(result).toHaveProperty("recordType", mockRow.recordType);
    expect(result.user).toHaveProperty("id", mockRow.user.id);
    expect(result.user).toHaveProperty("name", mockRow.user.name);
    expect(result.user).toHaveProperty("role", mockRow.user.role);
    expect(result).toHaveProperty("displayRecordId");
    expect(result.displayRecordId).toMatch(/^ref-/);
  });
});
