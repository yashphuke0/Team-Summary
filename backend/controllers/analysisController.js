const { analyzeTeam, teamSummary, analyzeMultipleTeams } = require('../services/analysisService');

exports.analyzeTeam = async (req, res) => {
    try {
        const result = await analyzeTeam(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to analyze team', error: error.message });
    }
};

exports.teamSummary = async (req, res) => {
    try {
        const result = await teamSummary(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate team summary', error: error.message });
    }
};

exports.analyzeMultipleTeams = async (req, res) => {
    try {
        const result = await analyzeMultipleTeams(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to analyze multiple teams', error: error.message });
    }
}; 