const { body } = require('express-validator');

const createReferralValidator = [
  body('studentName').trim().notEmpty().withMessage('Student name is required'),
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('concern').trim().notEmpty().withMessage('Concern type is required'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
];

module.exports = { createReferralValidator };
