const request = require("supertest");
const { PrismaClient } = require("@prisma/client");
const { signToken } = require("../../src/utils/jwt");

// audit.service is a side effect — keep it mocked so tests stay focused on route behaviour
jest.mock("../../src/services/audit.service", () => ({
  recordAuditLog:    jest.fn().mockResolvedValue(undefined),
  serializeAuditLog: jest.fn((row) => row),
  ACTION_LABELS:     {},
  userLabel:         jest.fn(() => "test-user"),
  displayRecordId:   jest.fn((type, id) => `${type}-${id.slice(-6)}`),
}));

const app    = require("../../src/app");
const prisma = new PrismaClient();

let teacherToken, teacher2Token, counsellorToken, leadToken;
let teacherUser, counsellorUser, leadUser;
let testCaseId, closedCaseId, existingCaseRefId, testTaskId;
let triageRef1Id, triageRef2Id, triageRef3Id;

beforeAll(async () => {
  // Look up users created by the seed
  teacherUser    = await prisma.user.findUniqueOrThrow({ where: { email: "ghimchong96+teacher@gmail.com" } });
  const teacher2 = await prisma.user.findUniqueOrThrow({ where: { email: "ghimchong96+teacher2@gmail.com" } });
  counsellorUser = await prisma.user.findUniqueOrThrow({ where: { email: "ghimchong96+counsellor@gmail.com" } });
  leadUser       = await prisma.user.findUniqueOrThrow({ where: { email: "ghimchong96+lead@gmail.com" } });

  // Generate real JWT tokens — authenticate middleware accepts these without Clerk
  teacherToken    = signToken({ sub: teacherUser.id,    role: teacherUser.role,    email: teacherUser.email });
  teacher2Token   = signToken({ sub: teacher2.id,       role: teacher2.role,       email: teacher2.email });
  counsellorToken = signToken({ sub: counsellorUser.id, role: counsellorUser.role, email: counsellorUser.email });
  leadToken       = signToken({ sub: leadUser.id,       role: leadUser.role,       email: leadUser.email });

  // Get the seeded Jamie Lee case for task tests (INT-06)
  const jamieCase = await prisma.case.findFirstOrThrow({ where: { referral: { studentName: "Jamie Lee" } } });
  testCaseId = jamieCase.id;

  // Pre-create one SUBMITTED referral per INT-05 triage test (each test needs its own fresh referral)
  const base = {
    concern: "Academic",
    description: "Integration test referral for triage testing purposes.",
    submittedById: teacherUser.id,
    status: "SUBMITTED",
  };
  const [r1, r2, r3] = await Promise.all([
    prisma.referral.create({ data: { ...base, studentName: "INT-TEST-Triage-Valid" } }),
    prisma.referral.create({ data: { ...base, studentName: "INT-TEST-Triage-HighNoNotes" } }),
    prisma.referral.create({ data: { ...base, studentName: "INT-TEST-Triage-InvalidRisk" } }),
  ]);
  triageRef1Id = r1.id;
  triageRef2Id = r2.id;
  triageRef3Id = r3.id;

  // Create a CLOSED case for INT-08 task-blocked and case-not-found tests
  const closedRef = await prisma.referral.create({
    data: {
      studentName: "INT-TEST-Closed-Case-Ref",
      concern: "Behavioural",
      description: "Integration test referral for closed case scenario testing.",
      submittedById: teacherUser.id,
      status: "CASE_OPENED",
    },
  });
  const closed = await prisma.case.create({
    data: { referralId: closedRef.id, assignedToId: counsellorUser.id, status: "CLOSED" },
  });
  closedCaseId = closed.id;

  // Create a referral that already has a case for the INT-09 duplicate case test
  const dupRef = await prisma.referral.create({
    data: {
      studentName: "INT-TEST-Dup-Case-Ref",
      concern: "Academic",
      description: "Integration test referral for duplicate case scenario testing.",
      submittedById: teacherUser.id,
      status: "CASE_OPENED",
    },
  });
  await prisma.case.create({
    data: { referralId: dupRef.id, assignedToId: counsellorUser.id, status: "OPEN" },
  });
  existingCaseRefId = dupRef.id;

  // Create a task for markTaskComplete test (INT-10)
  const taskForCompletion = await prisma.task.create({
    data: {
      title: "INT-TEST-Task-For-Complete",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedToId: counsellorUser.id,
      caseId: testCaseId,
    },
  });
  testTaskId = taskForCompletion.id;
});

afterAll(async () => {
  // Delete in FK-safe order: tasks → cases → referrals (all INT-TEST- prefixed)
  await prisma.task.deleteMany({ where: { title: { startsWith: "INT-TEST-" } } });
  const testRefs = await prisma.referral.findMany({
    where: { studentName: { startsWith: "INT-TEST-" } },
    select: { id: true },
  });
  const testRefIds = testRefs.map((r) => r.id);
  await prisma.case.deleteMany({ where: { referralId: { in: testRefIds } } });
  await prisma.referral.deleteMany({ where: { id: { in: testRefIds } } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-01: Referral Creation
// Route → Validator → Controller → real DB
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-01: Referral Creation", () => {
  const validBody = {
    studentName: "INT-TEST-Alice Tan",
    concern: "Academic",
    description: "Student has been struggling with attendance and coursework for the past month.",
  };

  test("valid referral is created and returns 201 with a referral ID", async () => {
    const res = await request(app)
      .post("/api/referrals")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send(validBody);

    expect(res.statusCode).toBe(201);
    expect(res.body.referral).toHaveProperty("id");
  });

  test("created referral has SUBMITTED status", async () => {
    const res = await request(app)
      .post("/api/referrals")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ ...validBody, studentName: "INT-TEST-Alice Tan 2" });

    expect(res.statusCode).toBe(201);
    expect(res.body.referral).toHaveProperty("status", "SUBMITTED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-02: Referral Validation
// Route → Validator → 400 before DB is touched
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-02: Referral Validation", () => {
  test("missing required fields return 400", async () => {
    const res = await request(app)
      .post("/api/referrals")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  test("description shorter than 20 characters returns 400", async () => {
    const res = await request(app)
      .post("/api/referrals")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ studentName: "INT-TEST-Bob", concern: "Academic", description: "Too short" });

    expect(res.statusCode).toBe(400);
  });

  test("empty student name returns 400", async () => {
    const res = await request(app)
      .post("/api/referrals")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        studentName: "",
        concern: "Academic",
        description: "Student has been struggling with attendance and coursework recently.",
      });

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-03: Teacher Referral Retrieval
// Route → Controller → real DB → Serializer
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-03: Teacher Referral Retrieval", () => {
  test("teacher sees their own referrals with status information", async () => {
    const res = await request(app)
      .get("/api/referrals/me")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.referrals)).toBe(true);
    res.body.referrals.forEach((r) => {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("statusLabel");
    });
  });

  test("referrals are scoped to the authenticated teacher only", async () => {
    // teacher2 has no referrals — their list must be empty
    const res = await request(app)
      .get("/api/referrals/me")
      .set("Authorization", `Bearer ${teacher2Token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.referrals).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-04: Counsellor Referral Queue & Filter
// Route → Controller → real DB query
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-04: Counsellor Referral Queue & Filter", () => {
  test("referral queue returns referrals with status counts", async () => {
    const res = await request(app)
      .get("/api/referrals/queue")
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.referrals)).toBe(true);
    expect(res.body).toHaveProperty("statusCounts");
    expect(res.body.statusCounts).toHaveProperty("ALL");
  });

  test("filtering queue by status returns only matching referrals", async () => {
    const res = await request(app)
      .get("/api/referrals/queue?status=SUBMITTED")
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    res.body.referrals.forEach((r) => {
      expect(r.status).toBe("SUBMITTED");
    });
  });

  test("invalid status filter returns 400", async () => {
    const res = await request(app)
      .get("/api/referrals/queue?status=INVALID")
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-05: Risk Assignment & Triage
// Route → Validator → Controller → real DB write
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-05: Risk Assignment & Triage", () => {
  test("valid triage updates risk level and persists to real DB", async () => {
    const res = await request(app)
      .patch(`/api/referrals/${triageRef1Id}/triage`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ riskLevel: "MEDIUM", triageNotes: "Student shows signs of academic stress.", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(200);
    expect(res.body.referral).toHaveProperty("riskLevel", "MEDIUM");

    // Confirm the change actually landed in the real database
    const row = await prisma.referral.findUnique({ where: { id: triageRef1Id } });
    expect(row.riskLevel).toBe("MEDIUM");
  });

  test("HIGH risk without triage notes returns 400", async () => {
    const res = await request(app)
      .patch(`/api/referrals/${triageRef2Id}/triage`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ riskLevel: "HIGH", triageNotes: "", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(400);
  });

  test("invalid risk level value returns 400", async () => {
    const res = await request(app)
      .patch(`/api/referrals/${triageRef3Id}/triage`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ riskLevel: "CRITICAL", triageNotes: "Some notes", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-06: Task Creation & Overdue Logic
// Route → Controller → real DB → taskOverdue.js
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-06: Task Creation & Overdue Logic", () => {
  const pastDue   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  test("task is created and linked to the correct case", async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/tasks`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ title: "INT-TEST-Follow up with student", dueDate: futureDue, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task).toHaveProperty("id");
    expect(res.body.task).toHaveProperty("caseId", testCaseId);
  });

  test("task with past due date is marked overdue", async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/tasks`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ title: "INT-TEST-Overdue task", dueDate: pastDue, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task.isOverdue).toBe(true);
  });

  test("task with future due date is not overdue", async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/tasks`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ title: "INT-TEST-Future task", dueDate: futureDue, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task.isOverdue).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-07: Dashboard & Audit Log Integration
// Dashboard Controller → real DB aggregation
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-07: Dashboard & Audit Log Integration", () => {
  test("dashboard returns 200 with correct metric structure", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${leadToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("referralsByRisk");
    expect(res.body).toHaveProperty("casesByStatus");
    expect(res.body).toHaveProperty("generatedAt");
  });

  test("dashboard metrics contain expected numeric fields", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${leadToken}`);

    expect(typeof res.body.metrics.totalReferrals).toBe("number");
    expect(typeof res.body.metrics.activeCases).toBe("number");
    expect(typeof res.body.metrics.overdueTasks).toBe("number");
    expect(typeof res.body.metrics.openTasks).toBe("number");
  });

  test("dashboard risk breakdown contains valid risk level keys", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${leadToken}`);

    expect(res.body.referralsByRisk).toHaveProperty("HIGH");
    expect(res.body.referralsByRisk).toHaveProperty("MEDIUM");
    expect(res.body.referralsByRisk).toHaveProperty("LOW");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-08: Case & Task Error Handling
// Route → Controller → real DB (error branches)
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-08: Case & Task Error Handling", () => {
  test("triaging a non-existing referral returns 404", async () => {
    const res = await request(app)
      .patch("/api/referrals/nonexistent-ref-id/triage")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ riskLevel: "LOW", triageNotes: "Notes", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(404);
  });

  test("updating case status with an invalid value returns 400", async () => {
    const res = await request(app)
      .patch(`/api/cases/${testCaseId}/status`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ status: "INVALID_STATUS" });

    expect(res.statusCode).toBe(400);
  });

  test("updating status of a non-existing case returns 404", async () => {
    const res = await request(app)
      .patch("/api/cases/nonexistent-case-id/status")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ status: "IN_PROGRESS" });

    expect(res.statusCode).toBe(404);
  });

  test("creating a task on a closed case returns 400", async () => {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post(`/api/cases/${closedCaseId}/tasks`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ title: "INT-TEST-Blocked task", dueDate: futureDue, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/closed/i);
  });

  test("creating a task on a non-existing case returns 404", async () => {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post("/api/cases/nonexistent-case-id/tasks")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ title: "INT-TEST-Ghost task", dueDate: futureDue, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-08b: Counsellor directory (DB + Clerk)
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-08b: Counsellor directory", () => {
  test("GET /api/users/counsellors returns assignable counsellors", async () => {
    const res = await request(app)
      .get("/api/users/counsellors")
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.counsellors)).toBe(true);
    expect(res.body.counsellors.some((c) => c.id === counsellorUser.id)).toBe(true);
  });

  test("lead can list counsellors for case assignment", async () => {
    const res = await request(app)
      .get("/api/users/counsellors")
      .set("Authorization", `Bearer ${leadToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.counsellors.length).toBeGreaterThan(0);
  });

  test("teacher cannot list counsellors", async () => {
    const res = await request(app)
      .get("/api/users/counsellors")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-09: Open Case Error Handling
// Route → Controller → real DB (conflict branches)
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-09: Open Case Error Handling", () => {
  test("opening a case without assignedToId returns 400", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ referralId: triageRef1Id });

    expect(res.statusCode).toBe(400);
  });

  test("opening a case with invalid assignedToId returns 400", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ referralId: triageRef1Id, assignedToId: leadUser.id });

    expect(res.statusCode).toBe(400);
  });

  test("opening a case for a non-existing referral returns 404", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ referralId: "nonexistent-ref-id", assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(404);
  });

  test("opening a case when one already exists returns 409", async () => {
    const res = await request(app)
      .post("/api/cases")
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ referralId: existingCaseRefId, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("lead can open a case with an assigned counsellor owner", async () => {
    const openRef = await prisma.referral.create({
      data: {
        studentName: "INT-TEST-Open-Case-Owner",
        concern: "Academic",
        description: "Integration test referral for open case owner assignment.",
        submittedById: teacherUser.id,
        status: "IN_REVIEW",
      },
    });

    const res = await request(app)
      .post("/api/cases")
      .set("Authorization", `Bearer ${leadToken}`)
      .send({ referralId: openRef.id, assignedToId: counsellorUser.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.case.assignedTo.id).toBe(counsellorUser.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-10: Case Retrieval & Updates
// Covers: getCases, getCase, updateCaseOutcome, markTaskComplete, createNote
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-10: Case Retrieval & Updates", () => {
  test("GET /api/cases returns list of cases with overdue task counts", async () => {
    const res = await request(app)
      .get("/api/cases")
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.cases)).toBe(true);
    res.body.cases.forEach((c) => {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("status");
      expect(c).toHaveProperty("overdueTaskCount");
    });
  });

  test("GET /api/cases/:id returns a single case with tasks", async () => {
    const res = await request(app)
      .get(`/api/cases/${testCaseId}`)
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.case).toHaveProperty("id", testCaseId);
    expect(Array.isArray(res.body.case.tasks)).toBe(true);
  });

  test("PATCH /api/cases/:id/outcome updates risk level on the case", async () => {
    const res = await request(app)
      .patch(`/api/cases/${testCaseId}/outcome`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ riskLevel: "HIGH", outcome: "ONGOING" });

    expect(res.statusCode).toBe(200);
    expect(res.body.case).toHaveProperty("riskLevel", "HIGH");
    expect(res.body.case).toHaveProperty("outcome", "ONGOING");
  });

  test("PATCH /api/cases/:id/tasks/:taskId/complete marks task as done", async () => {
    const res = await request(app)
      .patch(`/api/cases/${testCaseId}/tasks/${testTaskId}/complete`)
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.task).toHaveProperty("completed", true);
  });

  test("POST /api/cases/:id/notes adds a private note to the case", async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/notes`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({ content: "INT-TEST note content for the case." });

    expect(res.statusCode).toBe(201);
    expect(res.body.note).toHaveProperty("id");
    expect(res.body.note).toHaveProperty("content", "INT-TEST note content for the case.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-11: Session Notes
// Covers: createSessionNote, getSessionNotes
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-11: Session Notes", () => {
  test("POST /api/cases/:id/sessions creates a session note", async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/sessions`)
      .set("Authorization", `Bearer ${counsellorToken}`)
      .send({
        sessionType: "INDIVIDUAL",
        duration: 60,
        sessionDate: new Date().toISOString(),
        summary: "Student showed improvement in focus and engagement.",
        observations: "Student was calm and responsive throughout the session.",
        nextSteps: "Schedule follow-up in two weeks.",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("sessionNote");
    expect(res.body.sessionNote).toHaveProperty("sessionType", "INDIVIDUAL");
    expect(res.body.sessionNote).toHaveProperty("duration", 60);
  });

  test("GET /api/cases/:id/sessions returns list of session notes", async () => {
    const res = await request(app)
      .get(`/api/cases/${testCaseId}/sessions`)
      .set("Authorization", `Bearer ${counsellorToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.sessionNotes)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-12: Demo Login & Audit Logs
// Covers: auth.routes issueSession + demo-login, audit.controller listAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-12: Demo Login & Audit Logs", () => {
  test("POST /api/auth/demo-login returns a token and user for TEACHER role", async () => {
    const res = await request(app)
      .post("/api/auth/demo-login")
      .send({ role: "TEACHER" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user).toHaveProperty("role", "TEACHER");
  });

  test("GET /api/audit-logs returns list of audit log entries for LEAD_ADMIN", async () => {
    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${leadToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    res.body.logs.forEach((log) => {
      expect(log).toHaveProperty("action");
      expect(log).toHaveProperty("user");
    });
  });
});
