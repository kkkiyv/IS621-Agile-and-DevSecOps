const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../middleware/asyncHandler");
const { getCounsellors } = require("../controllers/user.controller");

const router = express.Router();

/** CH-005 — Counsellor / Lead lists assignable counsellors (DB + Clerk) */
router.get(
  "/counsellors",
  authenticate,
  requireRole("COUNSELLOR", "LEAD_ADMIN"),
  asyncHandler(getCounsellors)
);

module.exports = router;
