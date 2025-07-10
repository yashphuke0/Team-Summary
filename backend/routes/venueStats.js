const express = require('express');
const router = express.Router();
const venueStatsController = require('../controllers/venueStatsController');

router.post('/venue-stats', venueStatsController.venueStats);

module.exports = router; 