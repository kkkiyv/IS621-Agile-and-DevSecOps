const express = require("express");
const { ReferralStatus } = require("@prisma/client");
const { prisma } = require("../prisma");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const {
  toTeacherReferral,
  toCounsellorReferral,
} = require("../serializers/referral");

const router = express.Router();

const STATUSES = new Set(Object.values(ReferralStatus));

/**
 * CH-002 — Teacher: list own referrals with status-safe payload (no triage).
 */
router.get(
  "/me",
  authenticate,
  requireRole("TEACHER"),
  async (req, res) => {
    const rows = await prisma.referral.findMany({
      where: { submittedById: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    const referrals = rows.map(toTeacherReferral);
    return res.json({ referrals });
  }
);

/**
 * CH-003 — Counsellor: full queue; optional ?status=SUBMITTED|IN_TRIAGE|...
 */
router.get(
  "/queue",
  authenticate,
  requireRole("COUNSELLOR"),
  async (req, res) => {
    const raw = req.query.status;
    const status =
      typeof raw === "string" && raw.length > 0
        ? raw.trim().toUpperCase()
        : null;

    if (status && !STATUSES.has(status)) {
      return res.status(400).json({
        error: "Invalid status filter",
        allowed: [...STATUSES],
      });
    }

    const where = status ? { status } : {};

    const rows = await prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { id: true, email: true } },
      },
    });

    const referrals = rows.map(toCounsellorReferral);
    return res.json({ referrals, filter: status ? { status } : null });
  }
);

module.exports = router;
