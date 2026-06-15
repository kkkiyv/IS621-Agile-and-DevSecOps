const { ReferralStatus, CaseStatus, RiskLevel, CaseOutcome } = require("@prisma/client");
const { prisma } = require("../prisma");
const {
  countOverdueTasks,
  serializeTask,
} = require("../utils/taskOverdue");
const { recordAuditLog } = require("../services/audit.service");

const openCase = async (req, res) => {
  try {
    const { referralId } = req.body;

    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: { Case: true },
    });

    if (!referral) {
      return res.status(404).json({ error: "Referral not found" });
    }
    if (referral.status === ReferralStatus.CLOSED) {
      return res.status(400).json({ error: "Cannot open a case for a closed referral" });
    }
    if (referral.Case) {
      return res.status(409).json({ error: "A case already exists for this referral" });
    }

    const [, newCase] = await prisma.$transaction([
      prisma.referral.update({
        where: { id: referralId },
        data: { status: ReferralStatus.CASE_OPENED },
      }),
      prisma.case.create({
        data: {
          referralId,
          assignedToId: req.user.id,
          status: CaseStatus.OPEN,
        },
        include: {
          referral: {
            select: { id: true, studentName: true, concern: true, riskLevel: true },
          },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    await recordAuditLog({
      userId: req.user.id,
      action: "CASE_CREATED",
      details: `Case created for ${newCase.referral.studentName}`,
      recordId: newCase.id,
      recordType: "case",
    });

    return res.status(201).json({
      message: "Case opened successfully",
      case: {
        id: newCase.id,
        status: newCase.status,
        createdAt: newCase.createdAt,
        referral: newCase.referral,
        assignedTo: newCase.assignedTo,
      },
    });
  } catch (err) {
    console.error("openCase error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getCases = async (req, res) => {
  try {
    const now = new Date();
    const cases = await prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        referral: {
          select: {
            id: true,
            studentName: true,
            concern: true,
            riskLevel: true,
            triageNotes: true,
          },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        tasks: { select: { dueDate: true, completed: true } },
      },
    });

    return res.json({
      cases: cases.map((c) => ({
        id: c.id,
        status: c.status,
        riskLevel: c.riskLevel,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        referral: c.referral,
        assignedTo: c.assignedTo,
        overdueTaskCount: countOverdueTasks(c.tasks, now),
      })),
    });
  } catch (err) {
    console.error("getCases error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getCase = async (req, res) => {
  try {
    const { id } = req.params;
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        referral: {
          select: { id: true, studentName: true, concern: true, riskLevel: true, triageNotes: true },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        tasks: {
          orderBy: { dueDate: "asc" },
          include: { assignedTo: { select: { id: true, name: true } } },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    if (!c) return res.status(404).json({ error: "Case not found" });

    const now = new Date();
    return res.json({
      case: {
        ...c,
        riskLevel: c.riskLevel,
        outcome: c.outcome,
        outcomeNotes: c.outcomeNotes,
        tasks: c.tasks.map((task) => serializeTask(task, now)),
      },
    });
  } catch (err) {
    console.error("getCase error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const VALID_STATUSES = Object.values(CaseStatus);

const updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Case not found" });
    }

    const updated = await prisma.case.update({
      where: { id },
      data: { status },
      include: {
        referral: {
          select: { id: true, studentName: true, concern: true, riskLevel: true },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json({
      message: "Case status updated",
      case: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
        referral: updated.referral,
        assignedTo: updated.assignedTo,
      },
    });
  } catch (err) {
    console.error("updateCaseStatus error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const createTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, assignedToId } = req.body;

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Case not found" });

    if (existing.status === CaseStatus.CLOSED) {
      return res.status(400).json({ error: "Cannot create tasks for a closed case" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        dueDate: new Date(dueDate),
        assignedToId,
        caseId: id,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await recordAuditLog({
      userId: req.user.id,
      action: "TASK_CREATED",
      details: `Task created: ${title}`,
      recordId: task.id,
      recordType: "task",
    });

    return res.status(201).json({
      message: "Task created successfully",
      task: serializeTask(task),
    });
  } catch (err) {
    console.error("createTask error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markTaskComplete = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { completed: true },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return res.json({ task: serializeTask(updated) });
  } catch (err) {
    console.error("markTaskComplete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const createNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Case not found" });

    const note = await prisma.note.create({
      data: { content, caseId: id, authorId: req.user.id },
      include: { author: { select: { id: true, name: true } } },
    });

    await recordAuditLog({
      userId: req.user.id,
      action: "NOTE_CREATED",
      details: `Private note added to case`,
      recordId: note.id,
      recordType: "note",
    });

    return res.status(201).json({ note });
  } catch (err) {
    console.error("createNote error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const VALID_RISK_LEVELS = Object.values(RiskLevel);
const VALID_OUTCOMES = Object.values(CaseOutcome);

const updateCaseOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const { riskLevel, outcome, outcomeNotes } = req.body;

    if (riskLevel !== undefined && riskLevel !== null && !VALID_RISK_LEVELS.includes(riskLevel)) {
      return res.status(400).json({ error: `Invalid riskLevel. Must be one of: ${VALID_RISK_LEVELS.join(", ")}` });
    }
    if (outcome !== undefined && outcome !== null && !VALID_OUTCOMES.includes(outcome)) {
      return res.status(400).json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` });
    }

    const existing = await prisma.case.findUnique({ where: { id }, select: { referralId: true } });
    if (!existing) return res.status(404).json({ error: "Case not found" });

    const caseData = { ...(riskLevel !== undefined && { riskLevel: riskLevel ?? null }), ...(outcome !== undefined && { outcome: outcome ?? null }), ...(outcomeNotes !== undefined && { outcomeNotes: outcomeNotes ?? null }) };
    const ops = [prisma.case.update({ where: { id }, data: caseData })];
    if (riskLevel !== undefined) {
      ops.push(prisma.referral.update({ where: { id: existing.referralId }, data: { riskLevel: riskLevel ?? null } }));
    }
    const [updated] = await prisma.$transaction(ops);

    return res.json({
      message: "Case outcome updated",
      case: {
        id: updated.id,
        riskLevel: updated.riskLevel,
        outcome: updated.outcome,
        outcomeNotes: updated.outcomeNotes,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateCaseOutcome error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { openCase, getCases, getCase, updateCaseStatus, updateCaseOutcome, createTask, markTaskComplete, createNote };
