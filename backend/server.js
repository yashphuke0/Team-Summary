require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { limiter } = require('./middleware/rateLimiter');

const ocrRoutes = require('./routes/ocr');
const validationRoutes = require('./routes/validation');
const analysisRoutes = require('./routes/analysis');
const teamsRoutes = require('./routes/teams');
const teamFormRoutes = require('./routes/teamForm');
const debugRoutes = require('./routes/debug');
const healthRoutes = require('./routes/health');
const headToHeadRoutes = require('./routes/headToHead');
const playerPerformanceRoutes = require('./routes/playerPerformance');
const venueStatsRoutes = require('./routes/venueStats');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', limiter);

// Modular routes
app.use('/api/ocr', ocrRoutes);
app.use('/api', validationRoutes);
app.use('/api', analysisRoutes);
app.use('/api', teamsRoutes);
app.use('/api', teamFormRoutes);
app.use('/api', debugRoutes);
app.use('/api', healthRoutes);
app.use('/api', headToHeadRoutes);
app.use('/api', playerPerformanceRoutes);
app.use('/api', venueStatsRoutes);

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Don't serve frontend for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint not found'
        });
    }
    
    // Serve frontend for all other routes
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('🏏 ===================================');
    console.log('🏏  cricbuzz11 Team Analyzer Backend  ');
    console.log('🏏 ===================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🏏 Ready for enhanced cricket analysis!');
    console.log('🏏 ===================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});