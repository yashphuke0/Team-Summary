const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const upload = require('../middleware/upload');
const { strictLimiter } = require('../middleware/rateLimiter');

// OCR Processing endpoint
router.post('/process', strictLimiter, upload.single('image'), ocrController.processImage);

module.exports = router; 