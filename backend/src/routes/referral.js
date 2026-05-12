const express = require('express');
const router = express.Router();
const { protect, attachUser } = require('../middleware/auth');
const { createReferral } = require('../controllers/referral.controller');
const { createReferralValidator } = require('../validators/referral.validator');
const { validate } = require('../middleware/validate');

router.post('/', protect, attachUser, createReferralValidator, validate, createReferral);

module.exports = router;
