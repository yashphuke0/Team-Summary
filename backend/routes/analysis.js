const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

router.post('/analyze', analysisController.analyzeTeam);
router.post('/team-summary', analysisController.teamSummary);
router.post('/analyze-multiple', analysisController.analyzeMultipleTeams);

module.exports = router; 