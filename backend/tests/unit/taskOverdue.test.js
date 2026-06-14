const { isTaskOverdue, countOverdueTasks } = require("../../src/utils/taskOverdue");

const NOW = new Date("2026-06-14T12:00:00Z");
const PAST = "2026-06-01T00:00:00Z";
const FUTURE = "2026-12-31T00:00:00Z";

// ── Tests 9–11: Task overdue logic ────────────────────────────────────────────

describe("Task Overdue Logic", () => {
  test("Test 9: incomplete task with a past due date is marked overdue", () => {
    const task = { completed: false, dueDate: PAST };
    expect(isTaskOverdue(task, NOW)).toBe(true);
  });

  test("Test 10: completed task is never marked overdue even if due date has passed", () => {
    const task = { completed: true, dueDate: PAST };
    expect(isTaskOverdue(task, NOW)).toBe(false);
  });

  test("Test 11: overdue task count is calculated correctly", () => {
    const tasks = [
      { completed: false, dueDate: PAST },
      { completed: false, dueDate: PAST },
      { completed: true,  dueDate: PAST },
      { completed: false, dueDate: FUTURE },
    ];
    expect(countOverdueTasks(tasks, NOW)).toBe(2);
  });
});
