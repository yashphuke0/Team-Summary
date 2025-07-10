const { validateMatch, validatePlayers } = require('../services/validationService');

exports.validateMatch = async (req, res) => {
    try {
        const result = await validateMatch(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to validate match', error: error.message });
    }
};

exports.validatePlayers = async (req, res) => {
    try {
        const result = await validatePlayers(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to validate players', error: error.message });
    }
}; 