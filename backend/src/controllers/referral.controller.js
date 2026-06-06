const { ReferralStatus } = require("@prisma/client");
const { prisma } = require("../prisma");
const {
  toTeacherReferral,
  toCounsellorReferral,
  counsellorInclude,
} = require("../serializers/referral");

const STATUSES = new Set(Object.values(ReferralStatus));

const createReferral = async (req, res) => {
  const { studentName, concern, description } = req.body;
  const referral = await prisma.referral.create({
    data: {
      studentName,
      concern,
      description,
      submittedById: req.user.id,
      status: ReferralStatus.SUBMITTED,
    },
  });
  return res.status(201).json({
    message: "Referral submitted successfully",
    referral: toTeacherReferral(referral),
  });
};

const getMyReferrals = async (req, res) => {
  const rows = await prisma.referral.findMany({
    where: { submittedById: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ referrals: rows.map(toTeacherReferral) });
};

const getReferralQueue = async (req, res) => {
  const raw = req.query.status;
  const status =
    typeof raw === "string" && raw.length > 0 ? raw.trim().toUpperCase() : null;

  if (status && !STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status filter", allowed: [...STATUSES] });
  }

  const sort =
    req.query.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

  const where = status ? { status } : {};

  const [rows, grouped] = await Promise.all([
    prisma.referral.findMany({ where, orderBy: sort, include: counsellorInclude }),
    prisma.referral.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts = { ALL: 0 };
  for (const s of Object.values(ReferralStatus)) {
    statusCounts[s] = 0;
  }
  for (const g of grouped) {
    statusCounts[g.status] = g._count._all;
    statusCounts.ALL += g._count._all;
  }

  return res.json({
    referrals: rows.map(toCounsellorReferral),
    filter: status ? { status } : null,
    statusCounts,
  });
};

const getReferralById = async (req, res) => {
  const referral = await prisma.referral.findUnique({
    where: { id: req.params.id },
    include: counsellorInclude,
  });
  if (!referral) return res.status(404).json({ error: "Referral not found" });
  return res.json({ referral: toCounsellorReferral(referral) });
};

const triageReferral = async (req, res) => {
  const { id } = req.params;
  const { riskLevel, triageNotes, outcome } = req.body;

  const existing = await prisma.referral.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Referral not found" });
  if (existing.status === ReferralStatus.CLOSED) {
    return res.status(400).json({ error: "Cannot triage a closed referral" });
  }
  if (riskLevel === "HIGH" && (!triageNotes || triageNotes.trim().length === 0)) {
    return res.status(400).json({ error: "A justification note is required for High risk referrals" });
  }

  const newStatus = outcome === "CLOSE" ? ReferralStatus.CLOSED : ReferralStatus.IN_REVIEW;

  const referral = await prisma.referral.update({
    where: { id },
    data: {
      riskLevel,
      triageNotes: triageNotes?.trim() || null,
      status: newStatus,
      triagedById: req.user.id,
      triagedAt: new Date(),
    },
    include: counsellorInclude,
  });

  return res.json({
    message: "Referral triaged successfully",
    referral: toCounsellorReferral(referral),
  });
};

const updateCaseStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.case.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Case not found" });

  const VALID_STATUSES = new Set(Object.values(CaseStatus));
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  if (existing.status === CaseStatus.CLOSED) {
    return res.status(400).json({ error: "Cannot update a closed case" });
  }

  const updatedCase = await prisma.case.update({
    where: { id },
    data: { status },
  });

  return res.json({
    message: "Case updated successfully",
    case: updatedCase,
  });
};

module.exports = { createReferral, getMyReferrals, getReferralQueue, getReferralById, triageReferral, updateCaseStatus };
