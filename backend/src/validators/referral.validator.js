const { body } = require("express-validator");

const createReferralValidator = [
  body("studentName")
    .trim()
    .notEmpty()
    .withMessage("Student name is required")
    .isLength({ max: 50 })
    .withMessage("Student name must be at most 50 characters"),
  body("concern")
    .trim()
    .notEmpty()
    .withMessage("Concern category is required"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be at least 20 characters"),
];

const triageReferralValidator = [
  body("riskLevel")
    .notEmpty()
    .withMessage("Risk level is required")
    .isIn(["LOW", "MEDIUM", "HIGH"])
    .withMessage("Risk level must be LOW, MEDIUM or HIGH"),
  body("triageNotes")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Triage notes must be at most 200 characters"),
];

module.exports = { createReferralValidator, triageReferralValidator };
