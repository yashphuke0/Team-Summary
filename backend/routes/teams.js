const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');

router.get('/teams', teamsController.getTeams);
router.get('/teams/supabase', teamsController.getTeamsSupabase);

module.exports = router; 