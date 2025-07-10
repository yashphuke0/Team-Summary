const { processImageWithOCR, parseTeamDataFromOCRText } = require('../services/ocrService');

exports.processImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        const ocrText = await processImageWithOCR(req.file.buffer);
        const teamData = parseTeamDataFromOCRText(ocrText);
        if (teamData.players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No player data could be extracted from the image'
            });
        }
        res.json({
            success: true,
            data: teamData,
            message: `Successfully extracted ${teamData.players.length} players from your uploaded image`,
            extractedFromImage: true
        });
    } catch (error) {
        const errorMessage = error.message || 'Failed to process image';
        const isNetworkError = errorMessage.includes('Unable to connect') || errorMessage.includes('timeout');
        const isAPIKeyError = errorMessage.includes('OCR API key not configured');
        let statusCode = 500;
        let suggestion = 'Please try again with a clear Dream11 screenshot.';
        if (isAPIKeyError) {
            statusCode = 400;
            suggestion = 'Please configure your OCR API key in the .env file. Get a free key from https://ocr.space/ocrapi';
        } else if (isNetworkError) {
            statusCode = 503;
            suggestion = 'Please check your internet connection and try again.';
        } else if (errorMessage.includes('No text detected')) {
            statusCode = 400;
            suggestion = 'Please upload a clear Dream11 screenshot with visible player names.';
        }
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            suggestion: suggestion,
            requiresAPIKey: isAPIKeyError
        });
    }
}; 