const { CaseStatus } = require("@prisma/client");
const { prisma } = require("../prisma");
const { isTaskOverdue } = require("../utils/taskOverdue");

const RISK_LEVELS = ["HIGH", "MEDIUM", "LOW"];
const CASE_STATUSES = Object.values(CaseStatus);

const getDashboard = async (_req, res) => {
  try {
    const now = new Date();

    const [totalReferrals, cases, tasks, riskGrouped, statusGrouped] = await Promise.all([
      prisma.referral.count(),
      prisma.case.findMany({
        include: {
          referral: {
            select: { studentName: true, riskLevel: true },
          },
          assignedTo: { select: { name: true } },
        },
      }),
      prisma.task.findMany({
        include: {
          assignedTo: { select: { name: true } },
          case: {
            include: {
              referral: { select: { studentName: true } },
            },
          },
        },
      }),
      prisma.referral.groupBy({
        by: ["riskLevel"],
        _count: { _all: true },
        where: { riskLevel: { not: null } },
      }),
      prisma.case.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const activeCases = cases.filter((c) => c.status !== CaseStatus.CLOSED).length;
    const openTasks = tasks.filter((t) => !t.completed);
    const overdueTasks = openTasks.filter((t) => isTaskOverdue(t, now));

    const referralsByRisk = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const row of riskGrouped) {
      if (row.riskLevel) referralsByRisk[row.riskLevel] = row._count._all;
    }

    const casesByStatus = { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
    for (const status of CASE_STATUSES) casesByStatus[status] = 0;
    for (const row of statusGrouped) {
      casesByStatus[row.status] = row._count._all;
    }

    const openTasksByCase = new Map();
    for (const task of openTasks) {
      openTasksByCase.set(task.caseId, (openTasksByCase.get(task.caseId) ?? 0) + 1);
    }

    const overdueTaskItems = overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      studentName: t.case.referral.studentName,
      assignedToName: t.assignedTo.name,
      caseId: t.caseId,
    }));

    const riskCases = cases
      .filter(
        (c) =>
          c.referral.riskLevel === "HIGH" || c.referral.riskLevel === "MEDIUM"
      )
      .map((c) => ({
        id: c.id,
        studentName: c.referral.studentName,
        assignedToName: c.assignedTo.name,
        riskLevel: c.referral.riskLevel,
        openTaskCount: openTasksByCase.get(c.id) ?? 0,
      }))
      .sort((a, b) => {
        if (a.riskLevel === "HIGH" && b.riskLevel !== "HIGH") return -1;
        if (b.riskLevel === "HIGH" && a.riskLevel !== "HIGH") return 1;
        return b.openTaskCount - a.openTaskCount;
      });

    return res.json({
      metrics: {
        totalReferrals,
        activeCases,
        overdueTasks: overdueTasks.length,
        openTasks: openTasks.length,
      },
      referralsByRisk,
      casesByStatus,
      overdueTasks: overdueTaskItems,
      riskCases,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getDashboard };
