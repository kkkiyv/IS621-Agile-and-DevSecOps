const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../middleware/asyncHandler");
const { listAuditLogs } = require("../controllers/audit.controller");

const router = express.Router();

/** CH-014 — Lead/Admin audit log view */
router.get(
  "/",
  authenticate,
  requireRole("LEAD_ADMIN"),
  asyncHandler(listAuditLogs)
);

module.exports = router;
