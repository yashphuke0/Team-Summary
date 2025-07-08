const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection setup
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect()
    .then(client => {
        console.log('✅ Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// IPL 2025 Teams
const iplTeams = [
    'Chennai Super Kings',
    'Mumbai Indians',
    'Royal Challengers Bengaluru',
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
    origin: '*',
}));
app.use(express.json());


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
    console.log('Received OCR processing request');
    console.log(`Processing image: ${imageBuffer.length} bytes`);
    
    // Check if OCR API key is configured
    if (!process.env.OCR_API_KEY || process.env.OCR_API_KEY === 'your_ocr_space_api_key_here') {
        throw new Error('OCR API key not configured. Please set OCR_API_KEY in your .env file. Get a free key from https://ocr.space/ocrapi');
    }

    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        formData.append('apikey', process.env.OCR_API_KEY);
        formData.append('language', 'eng');
        formData.append('OCREngine', '1');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'false');
        formData.append('scale', 'true');

        console.log('Attempting OCR processing with API...');
        
        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 15000, // Reduced to 15 seconds for faster fallback
            maxRedirects: 3,
            validateStatus: function (status) {
                return status < 500; // Resolve only if the status code is less than 500
            }
        });

        if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            const extractedText = response.data.ParsedResults[0].ParsedText;
            console.log('✅ OCR processing successful');
            console.log('Extracted text from your image:', extractedText);
            return extractedText;
        } else {
            throw new Error('No text detected in the uploaded image. Please ensure the image is clear and contains visible player names.');
        }
    } catch (error) {
        console.error('OCR Error:', error.message);
        
        // Handle various types of network and timeout errors
        const isNetworkError = 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ECONNABORTED' || 
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNREFUSED' ||
            error.message.includes('timeout') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('network') ||
            error.message.includes('connect');
            
        if (isNetworkError) {
            throw new Error('Unable to connect to OCR service. Please check your internet connection and try again.');
        }
        
        // Re-throw the original error
        throw error;
    }
}

// Removed fallback function - now using only real OCR data from uploaded images

function parseTeamDataFromOCRText(ocrText) {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('📝 Parsing OCR text for team data. Total lines:', lines.length);
    console.log('Raw OCR lines:', lines);

    const players = [];
    let currentRole = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Identify player roles
        if (line.toUpperCase().includes('WICKET-KEEPER')) {
            currentRole = 'Wicket-Keeper';
            continue;
        }
        if (line.toUpperCase().includes('BATTER')) {
            currentRole = 'Batter';
            continue;
        }
        if (line.toUpperCase().includes('ALL-ROUNDER')) {
            currentRole = 'All-Rounder';
            continue;
        }
        if (line.toUpperCase().includes('BOWLER')) {
            currentRole = 'Bowler';
            continue;
        }
        
        // Comprehensive filter for non-player text
        const skipLine = (
            // Dream11 UI elements
            line.toLowerCase().includes('dream11') ||
            line.toLowerCase().includes('pts') ||
            line.toLowerCase().includes('team') ||
            line.toLowerCase().includes('match') ||
            line.toLowerCase().includes('save') ||
            line.toLowerCase().includes('selected') ||
            line.toLowerCase().includes('edit') ||
            line.toLowerCase().includes('confirm') ||
            line.toLowerCase().includes('submit') ||
            line.toLowerCase().includes('preview') ||
            line.toLowerCase().includes('credits') ||
            line.toLowerCase().includes('remaining') ||
            line.toLowerCase().includes('balance') ||
            
            // Team abbreviations and common misreadings
            /^(CSK|MI|RCB|KKR|DC|PBKS|RR|SRH|GT|LSG|DT|RC|KK|PB|SR|GU|LS)$/i.test(line) ||
            
            // Position labels
            line.toLowerCase().includes('wicket') ||
            line.toLowerCase().includes('keeper') ||
            line.toLowerCase().includes('batter') ||
            line.toLowerCase().includes('batsman') ||
            line.toLowerCase().includes('rounder') ||
            line.toLowerCase().includes('bowler') ||
            line.toLowerCase().includes('captain') ||
            
            // Numbers and points
            /^\d+$/.test(line) || // Pure numbers
            /^\d+\.\d+$/.test(line) || // Decimal numbers
            /^\d+\s*pts?$/i.test(line) || // Numbers with pts
            
            // Captain/Vice-captain markers
            line.toLowerCase() === 'c' ||
            line.toLowerCase() === 'vc' ||
            line.toLowerCase() === 'captain' ||
            line.toLowerCase() === 'vice' ||
            
            // Common OCR artifacts
            line.toLowerCase() === 'ot' ||
            line.toLowerCase() === 'o' ||
            line.toLowerCase() === 't' ||
            /^[.,;:!@#$%^&*()_+\-=\[\]{}|\\:";'<>?,./]$/.test(line) || // Special characters only
            
            // Too short or invalid
            line.length < 2 ||
            line.length > 25 || // Too long to be a player name
            
            // Common UI text patterns
            /^(tap|click|select|choose|add|remove|delete|cancel|ok|yes|no)$/i.test(line)
        );
        
        if (skipLine) {
            console.log(`❌ Filtered out: "${line}" (non-player text)`);
            continue;
        }

        // Strict player name validation
        const isValidPlayerName = (
            // Must contain letters, spaces, dots, hyphens, apostrophes only
            /^[A-Za-z\s\.\-']{2,}$/.test(line) &&
            
            // Must have at least one letter
            /[A-Za-z]/.test(line) &&
            
            // Should not be all caps single words (likely team names or UI elements)
            !(line.length <= 4 && line === line.toUpperCase()) &&
            
            // Should not contain brackets
            !line.includes('(') &&
            !line.includes(')') &&
            !line.includes('[') &&
            !line.includes(']') &&
            
            // Should not be common cricket terms
            !['BATTING', 'BOWLING', 'FIELDING', 'EXTRAS', 'TOTAL', 'RUNS', 'WICKETS', 'OVERS'].includes(line.toUpperCase()) &&
            
            // Should have reasonable format for a name (at least one space or be a single word of reasonable length)
            (line.includes(' ') || (line.length >= 3 && line.length <= 15))
        );

        if (isValidPlayerName) {
            // Clean the player name thoroughly
            let cleanName = line
                .replace(/\d+/g, '') // Remove all numbers
                .replace(/pts?/gi, '') // Remove points references
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            // Final validation after cleaning
            if (cleanName.length >= 2 && cleanName.length <= 20 && /^[A-Za-z\s\.\-']+$/.test(cleanName)) {
                console.log(`✅ Player found: "${cleanName}" (${currentRole || 'Unknown'})`);
                players.push({
                    name: cleanName,
                    role: currentRole || 'Unknown'
                });
            } else {
                console.log(`❌ Rejected after cleaning: "${line}" -> "${cleanName}" (failed final validation)`);
            }
        } else {
            console.log(`❌ Invalid name format: "${line}"`);
        }
    }

    // Remove duplicates while preserving order
    const uniquePlayers = players.filter((player, index, self) => 
        index === self.findIndex(p => p.name === player.name)
    );

    console.log(`🎯 Final Results: Extracted ${uniquePlayers.length} unique players:`);
    uniquePlayers.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.name} (${player.role})`);
    });

    // Captain and vice-captain will be handled manually by the user
    const captain = '';
    const viceCaptain = '';

    return {
        players: uniquePlayers.map(p => p.name).slice(0, 11), // Ensure max 11 players
        captain: captain,
        vice_captain: viceCaptain,
        playerDetails: uniquePlayers.slice(0, 11)
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
        console.log('Received OCR processing request');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        console.log(`Processing image: ${req.file.size} bytes, type: ${req.file.mimetype}`);

        // Process image with OCR (includes fallback handling)
        const ocrText = await processImageWithOCR(req.file.buffer);
        console.log('OCR text extracted successfully');

        // Parse team data from OCR text
        const teamData = parseTeamDataFromOCRText(ocrText);

        // Validate team data
        if (teamData.players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No player data could be extracted from the image'
            });
        }

        console.log(`Successfully processed team with ${teamData.players.length} players`);

        res.json({
            success: true,
            data: teamData,
            message: `Successfully extracted ${teamData.players.length} players from your uploaded image`,
            extractedFromImage: true
        });

    } catch (error) {
        console.error('OCR processing error:', error);
        
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
});

// Manual Team Input endpoint (fallback for OCR failures)
app.post('/api/manual-team', async (req, res) => {
    try {
        console.log('Received manual team input request');
        
        const { players, captain, viceCaptain } = req.body;
        
        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Players array is required'
            });
        }

        // Validate player data
        const validPlayers = players.filter(player => 
            typeof player === 'string' && player.trim().length > 0
        ).slice(0, 11); // Limit to 11 players

        if (validPlayers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid player names provided'
            });
        }

        const teamData = {
            players: validPlayers,
            captain: captain || '',
            vice_captain: viceCaptain || '',
            playerDetails: validPlayers.map(name => ({
                name: name,
                role: 'Unknown' // Role detection would need additional logic
            }))
        };

        console.log(`Manual team created with ${teamData.players.length} players`);

        res.json({
            success: true,
            data: teamData,
            message: `Successfully created team with ${teamData.players.length} players`,
            manualInput: true
        });

    } catch (error) {
        console.error('Manual team input error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process manual team input'
        });
    }
});

// ==============================================
// DATABASE ANALYSIS ENDPOINTS
// ==============================================

// 1. Team Recent Form - Last 5 matches win/loss
app.post('/api/team-recent-form', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        const query = `
            SELECT 
                m.match_id,
                m.match_date,
                t.team_name,
                CASE 
                    WHEN m.winner_team_id IS NULL THEN 'Draw'
                    WHEN m.winner_team_id = t.team_id THEN 'Win'
                    ELSE 'Loss'
                END AS result
            FROM matches m
            JOIN teams t ON m.team1_id = t.team_id OR m.team2_id = t.team_id
            WHERE t.team_name IN ($1, $2)
              AND m.match_date < $3
            ORDER BY t.team_name, m.match_date DESC
        `;

        const result = await pool.query(query, [teamA, teamB, matchDate]);

        // Group results by team and limit to 5 matches each
        const teamAMatches = result.rows.filter(row => row.team_name === teamA).slice(0, 5);
        const teamBMatches = result.rows.filter(row => row.team_name === teamB).slice(0, 5);

        res.json({
            success: true,
            data: {
                teamA: {
                    name: teamA,
                    matches: teamAMatches
                },
                teamB: {
                    name: teamB,
                    matches: teamBMatches
                }
            }
        });

    } catch (error) {
        console.error('Team recent form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team recent form'
        });
    }
});

// 2. Head-to-Head between teams
app.post('/api/head-to-head', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        const query = `
            SELECT 
                m.match_id,
                m.match_date,
                t1.team_name as team1,
                t2.team_name as team2,
                tw.team_name as winner
            FROM matches m
            JOIN teams t1 ON m.team1_id = t1.team_id
            JOIN teams t2 ON m.team2_id = t2.team_id
            LEFT JOIN teams tw ON m.winner_team_id = tw.team_id
            WHERE ((t1.team_name = $1 AND t2.team_name = $2) OR 
                   (t1.team_name = $2 AND t2.team_name = $1))
              AND m.match_date < $3
              AND m.match_date >= $4
            ORDER BY m.match_date DESC
        `;

        // Last 5 years from match date
        const fiveYearsAgo = new Date(matchDate);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        const result = await pool.query(query, [teamA, teamB, matchDate, fiveYearsAgo.toISOString().split('T')[0]]);

        // Calculate wins for each team
        const teamAWins = result.rows.filter(row => row.winner === teamA).length;
        const teamBWins = result.rows.filter(row => row.winner === teamB).length;
        const draws = result.rows.filter(row => !row.winner).length;

        res.json({
            success: true,
            data: {
                teamA: teamA,
                teamB: teamB,
                totalMatches: result.rows.length,
                teamAWins: teamAWins,
                teamBWins: teamBWins,
                draws: draws,
                recentMatches: result.rows.slice(0, 10) // Last 10 matches
            }
        });

    } catch (error) {
        console.error('Head-to-head error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch head-to-head data'
        });
    }
});

// 3. Player Performance - Captain and Vice-Captain
app.post('/api/player-performance', async (req, res) => {
    try {
        const { captain, viceCaptain, matchDate } = req.body;

        if (!captain || !viceCaptain || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'captain, viceCaptain, and matchDate are required'
            });
        }

        const query = `
            SELECT 
                pms.match_id,
                m.match_date,
                p.player_name,
                pms.runs_scored,
                pms.wickets_taken,
                pms.balls_faced,
                pms.strike_rate,
                pms.economy_rate
            FROM player_match_stats pms
            JOIN players p ON pms.player_id = p.player_id
            JOIN matches m ON pms.match_id = m.match_id
            WHERE p.player_name IN ($1, $2)
              AND m.match_date < $3
            ORDER BY p.player_name, m.match_date DESC
        `;

        const result = await pool.query(query, [captain, viceCaptain, matchDate]);

        // Group by player and limit to 5 matches each
        const captainStats = result.rows.filter(row => row.player_name === captain).slice(0, 5);
        const viceCaptainStats = result.rows.filter(row => row.player_name === viceCaptain).slice(0, 5);

        res.json({
            success: true,
            data: {
                captain: {
                    name: captain,
                    recentMatches: captainStats
                },
                viceCaptain: {
                    name: viceCaptain,
                    recentMatches: viceCaptainStats
                }
            }
        });

    } catch (error) {
        console.error('Player performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch player performance data'
        });
    }
});

// 4. Venue Statistics using CTE approach
app.post('/api/venue-stats', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        const query = `
            WITH selected_match AS (
                SELECT m.match_id, m.venue_id
                FROM matches m
                JOIN teams t1 ON m.team1_id = t1.team_id
                JOIN teams t2 ON m.team2_id = t2.team_id
                WHERE m.match_date = $3
                  AND t1.team_name = $1
                  AND t2.team_name = $2
                LIMIT 1
            ),
            venue_data AS (
                SELECT 
                    m.venue_id,
                    COUNT(DISTINCT m.match_id) AS total_matches,
                    ROUND(AVG(CASE WHEN s.innings = 1 THEN s.team_score END), 2) AS avg_first_innings_score,
                    ROUND(AVG(CASE WHEN s.innings = 2 THEN s.team_score END), 2) AS avg_second_innings_score,
                    SUM(s.team_wickets) AS total_wickets
                FROM matches m
                JOIN (
                    SELECT 
                        match_id,
                        team_id,
                        SUM(runs_scored) AS team_score,
                        SUM(wickets_taken) AS team_wickets,
                        ROW_NUMBER() OVER(PARTITION BY match_id ORDER BY team_id) AS innings
                    FROM player_match_stats
                    GROUP BY match_id, team_id
                ) s ON m.match_id = s.match_id
                WHERE m.venue_id = (SELECT venue_id FROM selected_match LIMIT 1)
                  AND m.match_date < $3
                GROUP BY m.venue_id
            )
            SELECT 
                v.venue_name,
                v.city as location,
                vd.total_matches,
                vd.avg_first_innings_score,
                vd.avg_second_innings_score,
                vd.total_wickets
            FROM venue_data vd
            JOIN venues v ON vd.venue_id = v.venue_id
        `;

        const result = await pool.query(query, [teamA, teamB, matchDate]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: 'No venue data found for this match combination',
                    venueStats: null
                }
            });
        }

        res.json({
            success: true,
            data: {
                venueStats: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Venue stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch venue statistics'
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

// Team Summary AI endpoint - Enhanced analysis with database stats
app.post('/api/team-summary', strictLimiter, async (req, res) => {
    try {
        const { 
            teamA, teamB, matchDate, captain, viceCaptain, players,
            teamFormData, headToHeadData, playerPerformanceData, venueStatsData
        } = req.body;

        if (!teamA || !teamB || !matchDate || !players || !Array.isArray(players)) {
            return res.status(400).json({
                success: false,
                message: 'Required match data missing'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'OpenAI API key not configured'
            });
        }

        // Analyze team composition
        const teamComposition = analyzeTeamComposition(players);
        
        // Analyze venue conditions
        const venueAnalysis = analyzeVenueConditions(venueStatsData);
        
        // Analyze team form
        const formAnalysis = analyzeTeamForm(teamFormData);
        
        // Analyze head-to-head
        const h2hAnalysis = analyzeHeadToHead(headToHeadData);
        
        // Analyze player performance
        const playerAnalysis = analyzePlayerPerformance(playerPerformanceData, captain, viceCaptain);

        // Create comprehensive prompt for OpenAI
        const prompt = `Analyze this Dream11 fantasy cricket team using the provided statistics:

**MATCH DETAILS:**
${teamA} vs ${teamB} on ${formatDateForPrompt(matchDate)}

**TEAM COMPOSITION:**
${teamComposition.summary}
- Batsmen: ${teamComposition.batsmen}
- Bowlers: ${teamComposition.bowlers} 
- All-rounders: ${teamComposition.allRounders}
- Wicket-keepers: ${teamComposition.wicketKeepers}

**RECENT FORM:**
${formAnalysis}

**HEAD-TO-HEAD:**
${h2hAnalysis}

**CAPTAIN & VICE-CAPTAIN:**
${playerAnalysis}

**VENUE CONDITIONS:**
${venueAnalysis}

**SELECTED PLAYERS:**
${players.join(', ')}
Captain: ${captain || 'Not selected'}
Vice-Captain: ${viceCaptain || 'Not selected'}

Please provide a CONCISE analysis in the following format:

🏆 **TEAM BALANCE** (Rating: X/10)
• [Brief point about batting strength]
• [Brief point about bowling attack]  
• [Brief point about all-rounder balance]

🎯 **CAPTAINCY CHOICE** (Rating: X/10)
• [Captain analysis in 1 line]
• [Vice-captain analysis in 1 line]

⚔️ **MATCH ADVANTAGE** 
• [Team form comparison]
• [Head-to-head edge]

🏟️ **VENUE STRATEGY** 
• [Venue scoring nature - high/low]
• [Team composition fit for venue]

🔍 **COVARIANCE ANALYSIS**
• [Risk assessment - e.g., "5 batsmen from ${teamA}, if they fail, limited backup"]
• [Bowling dependency - e.g., "Heavy reliance on ${teamB} bowlers"]

🏏 **PITCH CONDITIONS**
• [Pace vs Spin friendly assessment]
• [Team composition advantage]

🎖️ **OVERALL RATING: X/10**
• [Final recommendation in 1 line]

Keep each point to 1 line maximum. Focus on actionable insights.`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert fantasy cricket analyst specializing in IPL Dream11 teams. Provide concise, data-driven insights with specific ratings. Focus on team balance, venue strategy, and risk analysis. Keep responses short and actionable."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.6,
        });

        const summary = completion.choices[0].message.content;

        // Format summary for mobile display
        const formattedSummary = formatSummaryForMobile(summary);

        res.json({
            success: true,
            summary: formattedSummary,
            message: 'Team summary generated successfully'
        });

    } catch (error) {
        console.error('Team summary error:', error);

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
                message: 'Failed to generate team summary. Please try again.'
            });
        }
    }
});

// Helper functions for team analysis
function analyzeTeamComposition(players) {
    // This is a simplified analysis - in a real app, you'd have player role data
    // For now, we'll make educated guesses based on common player names/patterns
    const composition = {
        batsmen: 0,
        bowlers: 0,
        allRounders: 0,
        wicketKeepers: 0
    };

    // Simple heuristic based on common naming patterns and known players
    players.forEach(player => {
        const name = player.toLowerCase();
        if (name.includes('dhoni') || name.includes('pant') || name.includes('karthik') || 
            name.includes('rahul') || name.includes('samson')) {
            composition.wicketKeepers++;
        } else if (name.includes('bumrah') || name.includes('chahal') || name.includes('shami') ||
                   name.includes('kumar') || name.includes('archer') || name.includes('rashid')) {
            composition.bowlers++;
        } else if (name.includes('jadeja') || name.includes('pandya') || name.includes('russell') ||
                   name.includes('stoinis') || name.includes('narine')) {
            composition.allRounders++;
        } else {
            composition.batsmen++;
        }
    });

    return {
        ...composition,
        summary: `${composition.batsmen} batsmen, ${composition.bowlers} bowlers, ${composition.allRounders} all-rounders, ${composition.wicketKeepers} wicket-keepers`
    };
}

function analyzeVenueConditions(venueStatsData) {
    if (!venueStatsData?.success || !venueStatsData?.data?.venueStats) {
        return "Venue data not available";
    }

    const venue = venueStatsData.data.venueStats;
    const avgScore = venue.avg_first_innings_score || 0;
    
    if (avgScore > 180) {
        return `${venue.venue_name}: High-scoring venue (avg: ${avgScore}). Favor batsmen and expensive bowlers.`;
    } else if (avgScore < 150) {
        return `${venue.venue_name}: Low-scoring venue (avg: ${avgScore}). Favor bowlers and defensive players.`;
    } else {
        return `${venue.venue_name}: Balanced conditions (avg: ${avgScore}). Equal opportunity for batsmen and bowlers.`;
    }
}

function analyzeTeamForm(teamFormData) {
    if (!teamFormData?.success || !teamFormData?.data) {
        return "Team form data not available";
    }

    const teamA = teamFormData.data.teamA;
    const teamB = teamFormData.data.teamB;
    
    const teamAWins = teamA.matches.filter(m => m.result === 'Win').length;
    const teamBWins = teamB.matches.filter(m => m.result === 'Win').length;
    
    if (teamAWins > teamBWins) {
        return `${teamA.name} in better form (${teamAWins}/5 wins vs ${teamBWins}/5)`;
    } else if (teamBWins > teamAWins) {
        return `${teamB.name} in better form (${teamBWins}/5 wins vs ${teamAWins}/5)`;
    } else {
        return `Both teams in similar form (${teamAWins}/5 vs ${teamBWins}/5 wins)`;
    }
}

function analyzeHeadToHead(headToHeadData) {
    if (!headToHeadData?.success || !headToHeadData?.data) {
        return "Head-to-head data not available";
    }

    const h2h = headToHeadData.data;
    if (h2h.teamAWins > h2h.teamBWins) {
        return `${h2h.teamA} dominates head-to-head (${h2h.teamAWins}-${h2h.teamBWins} in last ${h2h.totalMatches} matches)`;
    } else if (h2h.teamBWins > h2h.teamAWins) {
        return `${h2h.teamB} dominates head-to-head (${h2h.teamBWins}-${h2h.teamAWins} in last ${h2h.totalMatches} matches)`;
    } else {
        return `Head-to-head evenly matched (${h2h.teamAWins}-${h2h.teamBWins} in last ${h2h.totalMatches} matches)`;
    }
}

function analyzePlayerPerformance(playerPerformanceData, captain, viceCaptain) {
    if (!playerPerformanceData?.success || !playerPerformanceData?.data) {
        return "Player performance data not available";
    }

    const captainData = playerPerformanceData.data.captain;
    const vcData = playerPerformanceData.data.viceCaptain;
    
    const captainAvg = captainData.recentMatches.length > 0 ? 
        (captainData.recentMatches.reduce((sum, m) => sum + m.runs_scored, 0) / captainData.recentMatches.length).toFixed(1) : 0;
    const vcAvg = vcData.recentMatches.length > 0 ? 
        (vcData.recentMatches.reduce((sum, m) => sum + m.runs_scored, 0) / vcData.recentMatches.length).toFixed(1) : 0;
    
    return `Captain ${captain}: ${captainAvg} runs/match average. Vice-Captain ${viceCaptain}: ${vcAvg} runs/match average.`;
}

function formatDateForPrompt(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatSummaryForMobile(summary) {
    // Convert the summary to mobile-friendly HTML format
    const lines = summary.split('\n');
    let formattedHtml = '';
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Handle section headers (with emojis and **bold**)
        if (line.includes('**') && (line.includes('🏆') || line.includes('🎯') || line.includes('⚔️') || 
                                   line.includes('🏟️') || line.includes('🔍') || line.includes('🏏') || line.includes('🎖️'))) {
            const cleanLine = line.replace(/\*\*/g, '');
            formattedHtml += `<div class="font-semibold text-gray-900 mb-2 mt-3 first:mt-0">${cleanLine}</div>`;
        }
        // Handle bullet points
        else if (line.startsWith('•')) {
            formattedHtml += `<div class="text-gray-700 ml-3 mb-1">${line}</div>`;
        }
        // Handle other content
        else if (line.length > 0) {
            formattedHtml += `<div class="text-gray-700 mb-1">${line}</div>`;
        }
    }
    
    return formattedHtml;
}

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