const { body } = require('express-validator');

const triageValidator = [
  body('riskLevel')
    .notEmpty().withMessage('Risk level is required')
    .isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Risk level must be LOW, MEDIUM or HIGH'),
  body('notes')
    .optional()
    .trim()
    .isLength({ min: 5 }).withMessage('Notes must be at least 5 characters'),
];

module.exports = { triageValidator };
