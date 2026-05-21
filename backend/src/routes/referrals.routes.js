const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  createReferralValidator,
  triageReferralValidator,
} = require("../validators/referral.validator");
const {
  createReferral,
  getMyReferrals,
  getReferralQueue,
  getReferralById,
  triageReferral,
} = require("../controllers/referral.controller");

const router = express.Router();

/** CH-001 — Teacher creates referral */
router.post(
  "/",
  authenticate,
  requireRole("TEACHER"),
  createReferralValidator,
  validate,
  asyncHandler(createReferral)
);

/** CH-002 — Teacher: own referrals */
router.get(
  "/me",
  authenticate,
  requireRole("TEACHER"),
  asyncHandler(getMyReferrals)
);

/** CH-003 — Counsellor / Lead queue */
router.get(
  "/queue",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getReferralQueue)
);

/** CH-003/004 — Single referral detail */
router.get(
  "/:id",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getReferralById)
);

/** CH-004 — Counsellor triage */
router.patch(
  "/:id/triage",
  authenticate,
  requireRole("COUNSELLOR"),
  triageReferralValidator,
  validate,
  asyncHandler(triageReferral)
);

module.exports = router;
