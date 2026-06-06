const { prisma } = require("../prisma");

const SESSION_TYPE_LABELS = {
  INDIVIDUAL: "Individual Session",
  GROUP: "Group Session",
  FAMILY: "Family Session",
  CRISIS: "Crisis Intervention",
};

function toSessionNote(row) {
  return {
    id: row.id,
    caseId: row.caseId,
    sessionType: row.sessionType,
    sessionTypeLabel: SESSION_TYPE_LABELS[row.sessionType] || row.sessionType,
    duration: row.duration,
    sessionDate: row.sessionDate,
    summary: row.summary,
    observations: row.observations,
    nextSteps: row.nextSteps,
    author: { id: row.author.id, name: row.author.name },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const authorInclude = { author: { select: { id: true, name: true } } };

const createSessionNote = async (req, res) => {
  const { id: caseId } = req.params;
  const { sessionType, duration, sessionDate, summary, observations, nextSteps } = req.body;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return res.status(404).json({ error: "Case not found" });
  if (existing.status === "CLOSED") {
    return res.status(400).json({ error: "Cannot add session notes to a closed case" });
  }

  const note = await prisma.sessionNote.create({
    data: {
      caseId,
      sessionType,
      duration: parseInt(duration, 10),
      sessionDate: new Date(sessionDate),
      summary,
      observations,
      nextSteps,
      authorId: req.user.id,
    },
    include: authorInclude,
  });

  return res.status(201).json({ sessionNote: toSessionNote(note) });
};

const getSessionNotes = async (req, res) => {
  const { id: caseId } = req.params;

  const existing = await prisma.case.findUnique({ where: { id: caseId } });
  if (!existing) return res.status(404).json({ error: "Case not found" });

  const notes = await prisma.sessionNote.findMany({
    where: { caseId },
    orderBy: { sessionDate: "desc" },
    include: authorInclude,
  });

  return res.json({ sessionNotes: notes.map(toSessionNote) });
};

module.exports = { createSessionNote, getSessionNotes };
