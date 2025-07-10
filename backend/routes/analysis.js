const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

router.post('/analyze', analysisController.analyzeTeam);
router.post('/team-summary', analysisController.teamSummary);

module.exports = router; 