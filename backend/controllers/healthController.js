exports.healthCheck = (req, res) => {
    res.json({
        status: 'healthy',
        message: 'cricbuzz11 Team Analyzer Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
    });
}; 