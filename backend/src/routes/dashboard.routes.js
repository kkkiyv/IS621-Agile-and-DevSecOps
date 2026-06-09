const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../middleware/asyncHandler");
const { getDashboard } = require("../controllers/dashboard.controller");

const router = express.Router();

/** CH-010 — Lead dashboard metrics */
router.get(
  "/",
  authenticate,
  requireRole("LEAD_ADMIN"),
  asyncHandler(getDashboard)
);

module.exports = router;
