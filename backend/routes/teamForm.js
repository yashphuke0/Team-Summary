const express = require('express');
const router = express.Router();
const teamFormController = require('../controllers/teamFormController');

router.post('/team-recent-form', teamFormController.getTeamRecentForm);

module.exports = router; 