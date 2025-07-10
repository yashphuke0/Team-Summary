const express = require('express');
const router = express.Router();
const playerPerformanceController = require('../controllers/playerPerformanceController');

router.post('/player-performance', playerPerformanceController.playerPerformance);

module.exports = router; 