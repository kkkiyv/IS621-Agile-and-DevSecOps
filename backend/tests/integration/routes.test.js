const request = require("supertest");

// ── Mocks must be declared before requiring app ───────────────────────────────

jest.mock("../../src/middleware/authenticate");

jest.mock("../../src/prisma", () => ({
  prisma: {
    referral: {
      create:    jest.fn(),
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      update:    jest.fn(),
      groupBy:   jest.fn(),
      count:     jest.fn(),
    },
    case: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      groupBy:   jest.fn(),
    },
    task: {
      create:   jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../../src/services/audit.service", () => ({
  recordAuditLog:    jest.fn().mockResolvedValue(undefined),
  serializeAuditLog: jest.fn((row) => row),
  ACTION_LABELS:     {},
  userLabel:         jest.fn(() => "test-user"),
  displayRecordId:   jest.fn((type, id) => `${type}-${id.slice(-6)}`),
}));

// ── Load app and mocked modules ───────────────────────────────────────────────

const app = require("../../src/app");
const { authenticate } = require("../../src/middleware/authenticate");
const { prisma } = require("../../src/prisma");

// ── Test users ────────────────────────────────────────────────────────────────

const TEACHER    = { id: "teacher-001", role: "TEACHER",     name: "Mr Smith",  email: "smith@school.edu" };
const COUNSELLOR = { id: "couns-001",   role: "COUNSELLOR",  name: "Dr Jones",  email: "jones@school.edu" };
const LEAD       = { id: "lead-001",    role: "LEAD_ADMIN",  name: "Ms Lee",    email: "lee@school.edu" };

function asUser(user) {
  authenticate.mockImplementation((req, _res, next) => {
    req.user = user;
    next();
  });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// INT-01: Referral Creation
// Route → Validator → Controller → Prisma DB
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-01: Referral Creation", () => {
  const validBody = {
    studentName: "Alice Tan",
    concern: "Academic",
    description: "Student has been struggling with attendance and coursework for the past month.",
  };

  const mockReferral = {
    id: "ref-abc-001",
    studentName: "Alice Tan",
    concern: "Academic",
    description: validBody.description,
    status: "SUBMITTED",
    submittedById: TEACHER.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("valid referral is created and returns 201 with a referral ID", async () => {
    asUser(TEACHER);
    prisma.referral.create.mockResolvedValue(mockReferral);

    const res = await request(app).post("/api/referrals").send(validBody);

    expect(res.statusCode).toBe(201);
    expect(res.body.referral).toHaveProperty("id", "ref-abc-001");
  });

  test("created referral has SUBMITTED status and teacher association", async () => {
    asUser(TEACHER);
    prisma.referral.create.mockResolvedValue(mockReferral);

    await request(app).post("/api/referrals").send(validBody);

    expect(prisma.referral.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentName: "Alice Tan",
          submittedById: TEACHER.id,
          status: "SUBMITTED",
        }),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-02: Referral Validation
// Route → Validator → Controller (validation stops before DB)
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-02: Referral Validation", () => {
  test("missing required fields return 400 and no DB write occurs", async () => {
    asUser(TEACHER);

    const res = await request(app).post("/api/referrals").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("errors");
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  test("description shorter than 20 characters returns 400", async () => {
    asUser(TEACHER);

    const res = await request(app).post("/api/referrals").send({
      studentName: "Bob",
      concern: "Academic",
      description: "Too short",
    });

    expect(res.statusCode).toBe(400);
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  test("empty student name returns 400", async () => {
    asUser(TEACHER);

    const res = await request(app).post("/api/referrals").send({
      studentName: "",
      concern: "Academic",
      description: "Student has been struggling with attendance and coursework recently.",
    });

    expect(res.statusCode).toBe(400);
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-03: Teacher Referral Retrieval
// Route → Controller → Prisma → Serializer
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-03: Teacher Referral Retrieval", () => {
  const teacherReferrals = [
    {
      id: "ref-001",
      studentName: "Alice",
      concern: "Academic",
      status: "SUBMITTED",
      submittedById: TEACHER.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "ref-002",
      studentName: "Bob",
      concern: "Behavioural",
      status: "IN_REVIEW",
      submittedById: TEACHER.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  test("teacher sees only their own referrals with status information", async () => {
    asUser(TEACHER);
    prisma.referral.findMany.mockResolvedValue(teacherReferrals);

    const res = await request(app).get("/api/referrals/me");

    expect(res.statusCode).toBe(200);
    expect(res.body.referrals).toHaveLength(2);
    expect(res.body.referrals[0]).toHaveProperty("id", "ref-001");
    expect(res.body.referrals[0]).toHaveProperty("status", "SUBMITTED");
    expect(res.body.referrals[0]).toHaveProperty("statusLabel");
  });

  test("query is scoped to teacher's own user ID", async () => {
    asUser(TEACHER);
    prisma.referral.findMany.mockResolvedValue(teacherReferrals);

    await request(app).get("/api/referrals/me");

    expect(prisma.referral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { submittedById: TEACHER.id },
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-04: Counsellor Referral Queue & Filter
// Route → Controller → Prisma Query
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-04: Counsellor Referral Queue & Filter", () => {
  const queueReferrals = [
    { id: "ref-101", studentName: "Carol", concern: "Mental Health", description: "...", status: "SUBMITTED", riskLevel: null, triageNotes: null, triagedAt: null, submittedBy: { id: "t1", name: "Mr Smith", email: "s@s.com" }, triagedBy: null, caseId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "ref-102", studentName: "Dan",   concern: "Academic",      description: "...", status: "IN_REVIEW", riskLevel: "LOW", triageNotes: "Notes", triagedAt: new Date().toISOString(), submittedBy: { id: "t1", name: "Mr Smith", email: "s@s.com" }, triagedBy: null, caseId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const groupedCounts = [
    { status: "SUBMITTED", _count: { _all: 1 } },
    { status: "IN_REVIEW",  _count: { _all: 1 } },
  ];

  test("referral queue returns all referrals with status counts", async () => {
    asUser(COUNSELLOR);
    prisma.referral.findMany.mockResolvedValue(queueReferrals);
    prisma.referral.groupBy.mockResolvedValue(groupedCounts);

    const res = await request(app).get("/api/referrals/queue");

    expect(res.statusCode).toBe(200);
    expect(res.body.referrals).toHaveLength(2);
    expect(res.body).toHaveProperty("statusCounts");
    expect(res.body.statusCounts.SUBMITTED).toBe(1);
  });

  test("filtering queue by status passes correct where clause to DB", async () => {
    asUser(COUNSELLOR);
    prisma.referral.findMany.mockResolvedValue([queueReferrals[0]]);
    prisma.referral.groupBy.mockResolvedValue(groupedCounts);

    const res = await request(app).get("/api/referrals/queue?status=SUBMITTED");

    expect(res.statusCode).toBe(200);
    expect(prisma.referral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "SUBMITTED" } })
    );
  });

  test("invalid status filter returns 400", async () => {
    asUser(COUNSELLOR);

    const res = await request(app).get("/api/referrals/queue?status=INVALID");

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-05: Risk Assignment & Triage
// Route → Validator → Controller → Prisma
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-05: Risk Assignment & Triage", () => {
  const existingReferral = {
    id: "ref-200",
    studentName: "Eve",
    status: "SUBMITTED",
    riskLevel: null,
    triageNotes: null,
  };

  const triagedReferral = {
    ...existingReferral,
    status: "IN_REVIEW",
    riskLevel: "MEDIUM",
    triageNotes: "Student shows signs of academic stress.",
    triagedById: COUNSELLOR.id,
    triagedAt: new Date().toISOString(),
    description: "...",
    submittedBy: { id: "t1", name: "Mr Smith", email: "s@s.com" },
    triagedBy: { id: COUNSELLOR.id, name: "Dr Jones" },
    caseId: null,
    concern: "Academic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("valid triage updates risk level and persists to DB", async () => {
    asUser(COUNSELLOR);
    prisma.referral.findUnique.mockResolvedValue(existingReferral);
    prisma.referral.update.mockResolvedValue(triagedReferral);

    const res = await request(app)
      .patch("/api/referrals/ref-200/triage")
      .send({ riskLevel: "MEDIUM", triageNotes: "Student shows signs of academic stress.", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(200);
    expect(res.body.referral).toHaveProperty("riskLevel", "MEDIUM");
    expect(prisma.referral.update).toHaveBeenCalled();
  });

  test("HIGH risk without triage notes returns 400", async () => {
    asUser(COUNSELLOR);
    prisma.referral.findUnique.mockResolvedValue(existingReferral);

    const res = await request(app)
      .patch("/api/referrals/ref-200/triage")
      .send({ riskLevel: "HIGH", triageNotes: "", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(400);
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });

  test("invalid risk level value returns 400", async () => {
    asUser(COUNSELLOR);

    const res = await request(app)
      .patch("/api/referrals/ref-200/triage")
      .send({ riskLevel: "CRITICAL", triageNotes: "Some notes", outcome: "OPEN_CASE" });

    expect(res.statusCode).toBe(400);
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-06: Task Creation & Overdue Logic
// Route → Controller → Prisma → taskOverdue.js
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-06: Task Creation & Overdue Logic", () => {
  const openCase = { id: "case-001", status: "OPEN" };

  const pastDue   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  test("task is created and linked to the correct case", async () => {
    asUser(COUNSELLOR);
    prisma.case.findUnique.mockResolvedValue(openCase);
    prisma.task.create.mockResolvedValue({
      id: "task-001",
      title: "Follow up with student",
      dueDate: futureDue,
      completed: false,
      caseId: "case-001",
      assignedToId: COUNSELLOR.id,
      assignedTo: { id: COUNSELLOR.id, name: "Dr Jones" },
    });

    const res = await request(app)
      .post("/api/cases/case-001/tasks")
      .send({ title: "Follow up with student", dueDate: futureDue, assignedToId: COUNSELLOR.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task).toHaveProperty("id", "task-001");
    expect(res.body.task).toHaveProperty("caseId", "case-001");
  });

  test("task with past due date is marked overdue", async () => {
    asUser(COUNSELLOR);
    prisma.case.findUnique.mockResolvedValue(openCase);
    prisma.task.create.mockResolvedValue({
      id: "task-002",
      title: "Overdue task",
      dueDate: pastDue,
      completed: false,
      caseId: "case-001",
      assignedToId: COUNSELLOR.id,
      assignedTo: { id: COUNSELLOR.id, name: "Dr Jones" },
    });

    const res = await request(app)
      .post("/api/cases/case-001/tasks")
      .send({ title: "Overdue task", dueDate: pastDue, assignedToId: COUNSELLOR.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task.isOverdue).toBe(true);
  });

  test("task with future due date is not overdue", async () => {
    asUser(COUNSELLOR);
    prisma.case.findUnique.mockResolvedValue(openCase);
    prisma.task.create.mockResolvedValue({
      id: "task-003",
      title: "Future task",
      dueDate: futureDue,
      completed: false,
      caseId: "case-001",
      assignedToId: COUNSELLOR.id,
      assignedTo: { id: COUNSELLOR.id, name: "Dr Jones" },
    });

    const res = await request(app)
      .post("/api/cases/case-001/tasks")
      .send({ title: "Future task", dueDate: futureDue, assignedToId: COUNSELLOR.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.task.isOverdue).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-07: Dashboard & Audit Log Integration
// Dashboard Controller → Audit Service → Prisma
// ─────────────────────────────────────────────────────────────────────────────

describe("INT-07: Dashboard & Audit Log Integration", () => {
  const pastDue   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    asUser(LEAD);

    prisma.referral.count.mockResolvedValue(5);

    prisma.case.findMany.mockResolvedValue([
      { id: "c1", status: "OPEN",        referral: { studentName: "Alice", riskLevel: "HIGH" },   assignedTo: { name: "Dr Jones" } },
      { id: "c2", status: "IN_PROGRESS", referral: { studentName: "Bob",   riskLevel: "MEDIUM" }, assignedTo: { name: "Dr Jones" } },
      { id: "c3", status: "CLOSED",      referral: { studentName: "Carol", riskLevel: "LOW" },    assignedTo: { name: "Dr Jones" } },
    ]);

    prisma.task.findMany.mockResolvedValue([
      { id: "t1", completed: false, dueDate: pastDue,   caseId: "c1", assignedTo: { name: "Dr Jones" }, case: { referral: { studentName: "Alice" } } },
      { id: "t2", completed: false, dueDate: futureDue, caseId: "c2", assignedTo: { name: "Dr Jones" }, case: { referral: { studentName: "Bob" } } },
      { id: "t3", completed: true,  dueDate: pastDue,   caseId: "c1", assignedTo: { name: "Dr Jones" }, case: { referral: { studentName: "Alice" } } },
    ]);

    prisma.referral.groupBy.mockResolvedValue([
      { riskLevel: "HIGH",   _count: { _all: 2 } },
      { riskLevel: "MEDIUM", _count: { _all: 2 } },
      { riskLevel: "LOW",    _count: { _all: 1 } },
    ]);

    prisma.case.groupBy.mockResolvedValue([
      { status: "OPEN",        _count: { _all: 1 } },
      { status: "IN_PROGRESS", _count: { _all: 1 } },
      { status: "CLOSED",      _count: { _all: 1 } },
    ]);
  });

  test("dashboard returns 200 with correct metric structure", async () => {
    const res = await request(app).get("/api/dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("referralsByRisk");
    expect(res.body).toHaveProperty("casesByStatus");
    expect(res.body).toHaveProperty("generatedAt");
  });

  test("dashboard metrics correctly count active cases and overdue tasks", async () => {
    const res = await request(app).get("/api/dashboard");

    expect(res.body.metrics.totalReferrals).toBe(5);
    expect(res.body.metrics.activeCases).toBe(2);    // OPEN + IN_PROGRESS
    expect(res.body.metrics.overdueTasks).toBe(1);   // only t1 is incomplete + past due
    expect(res.body.metrics.openTasks).toBe(2);      // t1 + t2 (t3 is completed)
  });

  test("dashboard risk breakdown matches referral group data", async () => {
    const res = await request(app).get("/api/dashboard");

    expect(res.body.referralsByRisk.HIGH).toBe(2);
    expect(res.body.referralsByRisk.MEDIUM).toBe(2);
    expect(res.body.referralsByRisk.LOW).toBe(1);
  });
});
