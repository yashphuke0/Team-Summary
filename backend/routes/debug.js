const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');

router.post('/debug/players', debugController.debugPlayers);
router.get('/debug/all-players', debugController.debugAllPlayers);

module.exports = router; 