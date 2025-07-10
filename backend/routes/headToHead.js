const express = require('express');
const router = express.Router();
const headToHeadController = require('../controllers/headToHeadController');

router.post('/head-to-head', headToHeadController.legacyHeadToHead);
router.post('/matches/head-to-head', headToHeadController.supabaseHeadToHead);

module.exports = router; 