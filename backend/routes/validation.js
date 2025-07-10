const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');

router.post('/validate-match', validationController.validateMatch);
router.post('/validate-players', validationController.validatePlayers);

module.exports = router; 