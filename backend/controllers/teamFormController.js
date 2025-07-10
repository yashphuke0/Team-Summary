const { getTeamRecentForm } = require('../services/teamFormService');

exports.getTeamRecentForm = async (req, res) => {
    try {
        const result = await getTeamRecentForm(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Team recent form error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch team recent form',
            error: error.message 
        });
    }
}; 