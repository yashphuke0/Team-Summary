const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// IPL 2025 Teams
const iplTeams = [
    'Chennai Super Kings',
    'Mumbai Indians', 
    'Royal Challengers Bangalore',
    'Kolkata Knight Riders',
    'Delhi Capitals',
    'Punjab Kings',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Gujarat Titans',
    'Lucknow Super Giants'
];

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limiting for OCR and AI analysis
const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per minute
    message: 'Too many API requests, please try again in a minute.'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// OCR Service Functions
async function processImageWithOCR(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        formData.append('apikey', process.env.OCR_API_KEY);
        formData.append('language', 'eng');
        formData.append('OCREngine', '2');
        formData.append('detectOrientation', 'false');
        formData.append('isTable', 'false');

        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000, // 30 seconds timeout
        });

        if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            return response.data.ParsedResults[0].ParsedText;
        } else {
            throw new Error('No text detected in image');
        }
    } catch (error) {
        console.error('OCR Error:', error.message);
        throw new Error('Failed to process image with OCR');
    }
}

function parseTeamDataFromOCRText(ocrText) {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const players = [];
    
    // First pass: collect all player names
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip common non-player text
        if (line.toLowerCase().includes('dream11') || 
            line.toLowerCase().includes('points') ||
            line.toLowerCase().includes('team') ||
            line.toLowerCase().includes('match') ||
            line.toLowerCase().includes('bowlers') ||
            line.toLowerCase().includes('batters') ||
            line.toLowerCase().includes('wicket-keepers') ||
            line.toLowerCase().includes('all-rounders') ||
            line.length < 3) {
            continue;
        }

        // Check if this line is a player name (letters, spaces, dots only)
        if (/^[A-Za-z\s\.]{3,}$/.test(line) && !line.includes('(') && !line.includes(')')) {
            players.push(line);
        }
    }

    // Remove duplicates while preserving order
    const uniquePlayers = [...new Set(players)];

    // If we don't have exactly 11 players, try alternative parsing
    if (uniquePlayers.length !== 11) {
        console.log(`Warning: Expected 11 players, found ${uniquePlayers.length}`);
        console.log('Detected players:', uniquePlayers);
    }

    return {
        players: uniquePlayers.slice(0, 11), // Ensure max 11 players
        captain: '', // Will be selected manually
        vice_captain: '' // Will be selected manually
    };
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Get IPL teams
app.get('/api/teams', (req, res) => {
    res.json({
        success: true,
        teams: iplTeams
    });
});

// OCR Processing endpoint
app.post('/api/ocr/process', strictLimiter, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        if (!process.env.OCR_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'OCR API key not configured'
            });
        }

        // Process image with OCR
        const ocrText = await processImageWithOCR(req.file.buffer);
        
        // Parse team data from OCR text
        const teamData = parseTeamDataFromOCRText(ocrText);

        // Validate team data
        if (teamData.players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No player data could be extracted from the image'
            });
        }

        res.json({
            success: true,
            data: teamData,
            message: `Successfully extracted ${teamData.players.length} players`
        });

    } catch (error) {
        console.error('OCR processing error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process image'
        });
    }
});

// AI Analysis endpoint
app.post('/api/analyze', strictLimiter, async (req, res) => {
    try {
        const { players, captain, vice_captain, teamA, teamB, matchDate } = req.body;

        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Player data is required'
            });
        }

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'Match details (teamA, teamB, matchDate) are required'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'OpenAI API key not configured'
            });
        }

        // Create analysis prompt
        const prompt = `Analyze this Dream11 fantasy cricket team for the match between ${teamA} vs ${teamB} on ${matchDate}:

Players: ${players.join(', ')}
Captain: ${captain || 'Not specified'}
Vice-captain: ${vice_captain || 'Not specified'}

Please provide a comprehensive analysis covering:
1. Team Balance: Analyze the batting, bowling, and all-rounder composition
2. Captain Choice: Evaluate if the captain selection is optimal
3. Vice-captain Choice: Assess the vice-captain selection
4. Match Context: Consider the teams playing and any strategic insights
5. Overall Rating: Rate the team out of 10 and explain why
6. Suggestions: Provide 2-3 specific improvements if any

Keep the analysis concise but informative, focusing on fantasy cricket strategy.`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert fantasy cricket analyst with deep knowledge of IPL players, team strategies, and Dream11 gameplay. Provide detailed, actionable insights."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        const analysis = completion.choices[0].message.content;

        res.json({
            success: true,
            analysis: analysis,
            message: 'Team analysis completed successfully'
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        
        if (error.code === 'insufficient_quota') {
            res.status(429).json({
                success: false,
                message: 'OpenAI API quota exceeded. Please try again later.'
            });
        } else if (error.code === 'rate_limit_exceeded') {
            res.status(429).json({
                success: false,
                message: 'OpenAI API rate limit exceeded. Please try again in a moment.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to analyze team. Please try again.'
            });
        }
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Dream11 Analyzer Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 OCR API: ${process.env.OCR_API_KEY ? 'Configured' : 'Missing'}`);
    console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
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