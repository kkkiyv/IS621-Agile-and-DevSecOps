const express = require('express');
const router = express.Router();
const { protect, attachUser } = require('../middleware/auth');
const { getReferrals, triageReferral } = require('../controllers/triage.controller');
const { triageValidator } = require('../validators/triage.validator');
const { validate } = require('../middleware/validate');

router.get('/', protect, attachUser, getReferrals);
router.patch('/:id/triage', protect, attachUser, triageValidator, validate, triageReferral);

module.exports = router;
