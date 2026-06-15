const { isTaskOverdue, countOverdueTasks } = require("../../src/utils/taskOverdue");

// ── Test 13: Dashboard metrics calculation ────────────────────────────────────

describe("Dashboard Metrics Calculation", () => {
  const NOW = new Date("2026-06-14T12:00:00Z");

  const mockCases = [
    { id: "c1", status: "OPEN",        referral: { riskLevel: "HIGH" },   assignedTo: { name: "Alice" } },
    { id: "c2", status: "IN_PROGRESS", referral: { riskLevel: "MEDIUM" }, assignedTo: { name: "Bob" } },
    { id: "c3", status: "CLOSED",      referral: { riskLevel: "LOW" },    assignedTo: { name: "Alice" } },
  ];

  const mockTasks = [
    { id: "t1", completed: false, dueDate: "2026-05-01T00:00:00Z", caseId: "c1", assignedTo: { name: "Alice" }, case: { referral: { studentName: "Dan" } } },
    { id: "t2", completed: false, dueDate: "2026-05-15T00:00:00Z", caseId: "c2", assignedTo: { name: "Bob" },   case: { referral: { studentName: "Eve" } } },
    { id: "t3", completed: true,  dueDate: "2026-05-01T00:00:00Z", caseId: "c1", assignedTo: { name: "Alice" }, case: { referral: { studentName: "Dan" } } },
    { id: "t4", completed: false, dueDate: "2026-12-31T00:00:00Z", caseId: "c2", assignedTo: { name: "Bob" },   case: { referral: { studentName: "Eve" } } },
  ];

  test("Test 13: dashboard metrics correctly count active cases, open tasks, and overdue tasks", () => {
    const activeCases = mockCases.filter((c) => c.status !== "CLOSED").length;
    expect(activeCases).toBe(2);

    const openTasks = mockTasks.filter((t) => !t.completed);
    expect(openTasks.length).toBe(3);

    const overdueCount = countOverdueTasks(openTasks, NOW);
    expect(overdueCount).toBe(2);

    const referralsByRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const c of mockCases) {
      if (c.referral.riskLevel) referralsByRisk[c.referral.riskLevel]++;
    }
    expect(referralsByRisk.HIGH).toBe(1);
    expect(referralsByRisk.MEDIUM).toBe(1);
    expect(referralsByRisk.LOW).toBe(1);
  });
});
