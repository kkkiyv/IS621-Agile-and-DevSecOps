const { ReferralStatus, CaseStatus } = require("@prisma/client");
const { prisma } = require("../prisma");

const openCase = async (req, res) => {
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
};

const getCases = async (req, res) => {
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
    },
  });

  return res.json({
    cases: cases.map((c) => ({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      referral: c.referral,
      assignedTo: c.assignedTo,
    })),
  });
};

module.exports = { openCase, getCases };
