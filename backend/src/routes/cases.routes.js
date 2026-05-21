const express = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../middleware/asyncHandler");
const { openCase, getCases } = require("../controllers/case.controller");

const router = express.Router();

/** CH-005 — Counsellor / Lead views all cases */
router.get(
  "/",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getCases)
);

/** CH-005 — Counsellor opens a case from a referral */
router.post(
  "/",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  body("referralId").isString().notEmpty().withMessage("referralId is required"),
  validate,
  asyncHandler(openCase)
);

module.exports = router;
