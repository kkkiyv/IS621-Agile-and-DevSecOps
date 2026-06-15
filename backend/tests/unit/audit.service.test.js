jest.mock("../../src/prisma", () => ({
  prisma: {
    auditLog: { create: jest.fn() },
  },
}));

const { serializeAuditLog, userLabel, displayRecordId, recordAuditLog } = require("../../src/services/audit.service");
const { prisma } = require("../../src/prisma");

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

  beforeEach(() => jest.clearAllMocks());

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

// ── Tests 15–16: recordAuditLog (mocked Prisma) ───────────────────────────────

describe("Audit Log Creation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("Test 15: recordAuditLog calls prisma.auditLog.create with correct data", async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await recordAuditLog({
      userId: "user-001",
      action: "REFERRAL_CREATED",
      details: "Referral created for Alice",
      recordId: "ref-abc-001",
      recordType: "referral",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-001",
        action: "REFERRAL_CREATED",
        details: "Referral created for Alice",
        recordId: "ref-abc-001",
        recordType: "referral",
      },
    });
  });

  test("Test 16: recordAuditLog swallows DB errors silently", async () => {
    prisma.auditLog.create.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      recordAuditLog({
        userId: "user-001",
        action: "REFERRAL_CREATED",
        details: "Referral created for Alice",
        recordId: "ref-abc-001",
        recordType: "referral",
      })
    ).resolves.toBeUndefined();
  });
});

// ── Tests 17–18: displayRecordId and userLabel edge cases ─────────────────────

describe("Audit Helper Functions", () => {
  test("Test 17: displayRecordId uses recordType as prefix for unknown types", () => {
    const result = displayRecordId("session", "abc123def456");
    expect(result).toBe("session-def456");
  });

  test("Test 18: userLabel falls back to user ID when email prefix is empty", () => {
    const user = {
      id: "user-abc-123456",
      name: "Mr Smith",
      role: "TEACHER",
      email: "+@school.edu",
    };
    const result = userLabel(user);
    expect(result).toContain("123456");
  });
});
