const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');

router.get('/teams', teamsController.getTeams);
router.get('/teams/supabase', teamsController.getTeamsSupabase);
router.post('/eligible-players', teamsController.eligiblePlayers);

module.exports = router; 