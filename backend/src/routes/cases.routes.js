const express = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../middleware/asyncHandler");
const { openCase, getCases, getCase, updateCaseStatus, updateCaseOutcome, createTask, markTaskComplete, createNote } = require("../controllers/case.controller");
const { createSessionNote, getSessionNotes } = require("../controllers/session.controller");

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

/** CH-004 — Counsellor views a single case with tasks */
router.get(
  "/:id",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getCase)
);

/** CH-006 — Counsellor updates case status */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  body("status").isString().notEmpty().withMessage("status is required"),
  validate,
  asyncHandler(updateCaseStatus)
);

/** CH-004 — Counsellor updates case risk level and outcome */
router.patch(
  "/:id/outcome",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  validate,
  asyncHandler(updateCaseOutcome)
);

/** CH-007 — Counsellor creates a follow-up task */
router.post(
  "/:id/tasks",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  body("title").isString().notEmpty().withMessage("title is required"),
  body("dueDate").isISO8601().withMessage("dueDate must be a valid date"),
  body("assignedToId").isString().notEmpty().withMessage("assignedToId is required"),
  validate,
  asyncHandler(createTask)
);

/** CH-004 — Mark a task complete */
router.patch(
  "/:id/tasks/:taskId/complete",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(markTaskComplete)
);

/** CH-010 — Counsellor adds a secure note to a case */
router.post(
  "/:id/notes",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  body("content").isString().notEmpty().withMessage("content is required"),
  validate,
  asyncHandler(createNote)
);

/** CH-015 — Counsellor lists session notes for a case */
router.get(
  "/:id/sessions",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getSessionNotes)
);

/** CH-015 — Counsellor creates a session note */
router.post(
  "/:id/sessions",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  body("sessionType").isIn(["INDIVIDUAL", "GROUP", "FAMILY", "CRISIS"]).withMessage("Invalid session type"),
  body("duration").isInt({ min: 1 }).withMessage("Duration must be a positive integer"),
  body("sessionDate").isISO8601().withMessage("sessionDate must be a valid date"),
  body("summary").isString().notEmpty().withMessage("Summary is required"),
  body("observations").isString().notEmpty().withMessage("Observations is required"),
  body("nextSteps").isString().notEmpty().withMessage("Next steps is required"),
  validate,
  asyncHandler(createSessionNote)
);

module.exports = router;
