const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase connection setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('teams').select('count').limit(1);
        if (error) throw error;
        console.log('SUCCESS: Supabase connected successfully');
    } catch (err) {
        console.error('ERROR: Supabase connection failed:', err.message);
    }
}

testSupabaseConnection();

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
        } else if (file.mimetype.startsWith('text/csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only image or CSV files are allowed!'), false);
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
            console.log('SUCCESS: OCR processing successful');
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
    
    console.log('INFO: Parsing OCR text for team data. Total lines:', lines.length);
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
            console.log(`FILTER: Filtered out: "${line}" (non-player text)`);
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
                console.log(`SUCCESS: Player found: "${cleanName}" (${currentRole || 'Unknown'})`);
                players.push({
                    name: cleanName,
                    role: currentRole || 'Unknown'
                });
            } else {
                console.log(`REJECT: Rejected after cleaning: "${line}" -> "${cleanName}" (failed final validation)`);
            }
        } else {
            console.log(`REJECT: Invalid name format: "${line}"`);
        }
    }

    // Remove duplicates while preserving order
    const uniquePlayers = players.filter((player, index, self) => 
        index === self.findIndex(p => p.name === player.name)
    );

    console.log(`RESULTS: Extracted ${uniquePlayers.length} unique players:`);
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

// ==============================================
// HELPER FUNCTIONS FOR BULK TEAM PROCESSING
// ==============================================

// Parse CSV teams data
function parseCSVTeams(csvContent) {
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['teamname', 'players', 'captain', 'vicecaptain'];
    
    // Validate headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const teams = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',').map(v => v.trim());
        
        if (values.length < headers.length) {
            console.warn(`Skipping line ${i + 1}: insufficient columns`);
            continue;
        }

        const teamData = {};
        headers.forEach((header, index) => {
            teamData[header] = values[index] || '';
        });

        // Parse players (comma-separated or semicolon-separated)
        const playersStr = teamData.players;
        const players = playersStr.includes(';') ? 
            playersStr.split(';').map(p => p.trim()).filter(p => p.length > 0) :
            playersStr.split(',').map(p => p.trim()).filter(p => p.length > 0);

        if (players.length === 0) {
            console.warn(`Skipping line ${i + 1}: no valid players found`);
            continue;
        }

        // Validate team data
        if (players.length > 11) {
            console.warn(`Line ${i + 1}: Team has ${players.length} players, limiting to 11`);
            players.splice(11);
        }

        teams.push({
            teamId: i,
            teamName: teamData.teamname || `Team ${i}`,
            players: players,
            captain: teamData.captain || '',
            vice_captain: teamData.vicecaptain || '',
            playerDetails: players.map(name => ({
                name: name,
                role: 'Unknown'
            }))
        });
    }

    return teams;
}

// Generate teams summary
function generateTeamsSummary(teams) {
    const totalTeams = teams.length;
    const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
    const avgPlayersPerTeam = totalPlayers / totalTeams;
    
    // Count unique players across all teams
    const allPlayers = new Set();
    teams.forEach(team => {
        team.players.forEach(player => allPlayers.add(player));
    });
    
    const uniquePlayers = allPlayers.size;
    
    // Find most common players
    const playerCounts = {};
    teams.forEach(team => {
        team.players.forEach(player => {
            playerCounts[player] = (playerCounts[player] || 0) + 1;
        });
    });
    
    const mostCommonPlayers = Object.entries(playerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count }));

    return {
        totalTeams,
        totalPlayers,
        avgPlayersPerTeam: Math.round(avgPlayersPerTeam * 10) / 10,
        uniquePlayers,
        mostCommonPlayers
    };
}

// Analyze single team (reuse existing analysis logic)
async function analyzeSingleTeam(team, matchDetails) {
    // This function will reuse the existing analysis logic
    // For now, we'll create a simplified analysis
    const composition = analyzeTeamComposition(team.players);
    
    const analysis = {
        teamComposition: composition,
        playerCount: team.players.length,
        captain: team.captain,
        vice_captain: team.vice_captain,
        summary: `Team with ${team.players.length} players. ${composition.summary}`
    };

    // If OpenAI is available, get AI analysis
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
        try {
            const prompt = `Analyze this Dream11 team for IPL match ${matchDetails.teamA} vs ${matchDetails.teamB} on ${formatDateForPrompt(matchDetails.matchDate)}:

Players: ${team.players.join(', ')}
Captain: ${team.captain}
Vice-Captain: ${team.vice_captain}
Team Composition: ${composition.summary}

Provide a brief analysis (max 3 sentences) focusing on team balance and strategy.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert fantasy cricket analyst. Provide concise, actionable insights."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 150,
                temperature: 0.6,
            });

            analysis.aiAnalysis = completion.choices[0].message.content;
        } catch (error) {
            console.error('AI analysis failed for team:', error);
            analysis.aiAnalysis = 'AI analysis not available';
        }
    }

    return analysis;
}

// Generate comparative analysis across all teams
function generateComparativeAnalysis(analysisResults, matchDetails) {
    if (analysisResults.length === 0) {
        return { message: 'No teams to compare' };
    }

    const totalTeams = analysisResults.length;
    
    // Analyze team compositions
    const compositions = analysisResults.map(result => result.analysis.teamComposition);
    const avgBatsmen = compositions.reduce((sum, comp) => sum + comp.batsmen, 0) / totalTeams;
    const avgBowlers = compositions.reduce((sum, comp) => sum + comp.bowlers, 0) / totalTeams;
    const avgAllRounders = compositions.reduce((sum, comp) => sum + comp.allRounders, 0) / totalTeams;
    const avgWicketKeepers = compositions.reduce((sum, comp) => sum + comp.wicketKeepers, 0) / totalTeams;

    // Find most popular players
    const playerCounts = {};
    analysisResults.forEach(result => {
        result.players.forEach(player => {
            playerCounts[player] = (playerCounts[player] || 0) + 1;
        });
    });

    const mostPopularPlayers = Object.entries(playerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    // Find most popular captains and vice-captains
    const captainCounts = {};
    const viceCaptainCounts = {};
    
    analysisResults.forEach(result => {
        if (result.captain) {
            captainCounts[result.captain] = (captainCounts[result.captain] || 0) + 1;
        }
        if (result.vice_captain) {
            viceCaptainCounts[result.vice_captain] = (viceCaptainCounts[result.vice_captain] || 0) + 1;
        }
    });

    const mostPopularCaptains = Object.entries(captainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    const mostPopularViceCaptains = Object.entries(viceCaptainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    return {
        matchDetails,
        totalTeams,
        averageComposition: {
            batsmen: Math.round(avgBatsmen * 10) / 10,
            bowlers: Math.round(avgBowlers * 10) / 10,
            allRounders: Math.round(avgAllRounders * 10) / 10,
            wicketKeepers: Math.round(avgWicketKeepers * 10) / 10
        },
        mostPopularPlayers,
        mostPopularCaptains,
        mostPopularViceCaptains,
        summary: `Analysis of ${totalTeams} teams for ${matchDetails.teamA} vs ${matchDetails.teamB}`
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

// Get IPL teams (hardcoded)
app.get('/api/teams', (req, res) => {
    res.json({
        success: true,
        teams: iplTeams
    });
});

// Test Supabase - Get teams from database
app.get('/api/teams/supabase', async (req, res) => {
    try {
        console.log('INFO: Testing Supabase connection...');
        
        const { data: teams, error } = await supabase
            .from('teams')
            .select('team_id, team_name, short_name')
            .order('team_name', { ascending: true });
            
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('SUCCESS: Supabase query successful! Found', teams.length, 'teams');
        
        res.json({
            success: true,
            message: 'Supabase is working!',
            teams: teams,
            count: teams.length,
            supabaseWorking: true
        });
    } catch (error) {
        console.error('ERROR: Supabase test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Supabase connection failed',
            error: error.message,
            supabaseWorking: false
        });
    }
});

// Head-to-Head matches between teams using Supabase
app.post('/api/matches/head-to-head', async (req, res) => {
    try {
        const { teamA, teamB, beforeDate, limit = 5 } = req.body;

        if (!teamA || !teamB || !beforeDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and beforeDate are required'
            });
        }

        console.log(`INFO: Finding last ${limit} matches between ${teamA} and ${teamB} before ${beforeDate}`);

        // First, get team IDs for the specified teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) {
            console.error('Teams query error:', teamsError);
            throw teamsError;
        }

        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: `One or both teams not found in database. Available teams: ${teams.map(t => t.team_name).join(', ')}`
            });
        }

        const teamAData = teams.find(t => t.team_name === teamA);
        const teamBData = teams.find(t => t.team_name === teamB);

        console.log(`Team A: ${teamAData.team_name} (ID: ${teamAData.team_id})`);
        console.log(`Team B: ${teamBData.team_name} (ID: ${teamBData.team_id})`);

        // Query for head-to-head matches using Supabase
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(`
                match_id,
                match_date,
                team1_id,
                team2_id,
                winner_team_id,
                teams!team1_id(team_name),
                teams_team2:teams!team2_id(team_name),
                teams_winner:teams!winner_team_id(team_name),
                venues(venue_name, city)
            `)
            .or(`and(team1_id.eq.${teamAData.team_id},team2_id.eq.${teamBData.team_id}),and(team1_id.eq.${teamBData.team_id},team2_id.eq.${teamAData.team_id})`)
            .lt('match_date', beforeDate)
            .order('match_date', { ascending: false })
            .limit(limit);

        if (matchesError) {
            console.error('Matches query error:', matchesError);
            throw matchesError;
        }

        console.log(`SUCCESS: Found ${matches.length} head-to-head matches`);

        // Process matches to calculate wins
        const teamAWins = matches.filter(match => match.winner_team_id === teamAData.team_id).length;
        const teamBWins = matches.filter(match => match.winner_team_id === teamBData.team_id).length;
        const draws = matches.filter(match => !match.winner_team_id).length;

        // Format the response
        const formattedMatches = matches.map(match => ({
            match_id: match.match_id,
            match_date: match.match_date,
            team1: match.teams?.team_name || teamA,
            team2: match.teams_team2?.team_name || teamB,
            winner: match.teams_winner?.team_name || null,
            venue: match.venues?.venue_name || 'Unknown',
            city: match.venues?.city || 'Unknown'
        }));

        res.json({
            success: true,
            query: `Last ${limit} matches between ${teamA} and ${teamB} before ${beforeDate}`,
            data: {
                teamA: teamA,
                teamB: teamB,
                beforeDate: beforeDate,
                totalMatches: matches.length,
                teamAWins: teamAWins,
                teamBWins: teamBWins,
                draws: draws,
                matches: formattedMatches
            },
            supabaseQuery: true
        });

    } catch (error) {
        console.error('ERROR: Head-to-head query failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch head-to-head matches',
            error: error.message
        });
    }
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

// CSV Bulk Team Processing endpoint
app.post('/api/csv/process-teams', strictLimiter, upload.single('csv'), async (req, res) => {
    try {
        console.log('Received CSV bulk team processing request');
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file provided'
            });
        }

        console.log(`Processing CSV: ${req.file.size} bytes, type: ${req.file.mimetype}`);

        // Parse CSV content
        const csvContent = req.file.buffer.toString('utf-8');
        const teams = parseCSVTeams(csvContent);

        if (teams.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid team data found in CSV'
            });
        }

        console.log(`Successfully processed ${teams.length} teams from CSV`);

        res.json({
            success: true,
            data: {
                teams: teams,
                totalTeams: teams.length,
                summary: generateTeamsSummary(teams)
            },
            message: `Successfully processed ${teams.length} teams from CSV`
        });

    } catch (error) {
        console.error('CSV processing error:', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process CSV file',
            suggestion: 'Please ensure your CSV follows the required format'
        });
    }
});

// Multiple Screenshots Processing endpoint
app.post('/api/ocr/process-multiple', strictLimiter, upload.array('images', 10), async (req, res) => {
    try {
        console.log('Received multiple screenshots processing request');
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No image files provided'
            });
        }

        console.log(`Processing ${req.files.length} screenshots`);

        const teams = [];
        const errors = [];

        // Process each image
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            try {
                console.log(`Processing image ${i + 1}/${req.files.length}: ${file.originalname}`);
                
                const ocrText = await processImageWithOCR(file.buffer);
                const teamData = parseTeamDataFromOCRText(ocrText);
                
                if (teamData.players.length > 0) {
                    teams.push({
                        teamId: i + 1,
                        fileName: file.originalname,
                        players: teamData.players,
                        captain: teamData.captain,
                        vice_captain: teamData.vice_captain,
                        playerDetails: teamData.playerDetails
                    });
                } else {
                    errors.push({
                        fileName: file.originalname,
                        error: 'No player data extracted'
                    });
                }
            } catch (error) {
                console.error(`Error processing image ${file.originalname}:`, error);
                errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
            }
        }

        if (teams.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No teams could be extracted from any of the uploaded images',
                errors: errors
            });
        }

        console.log(`Successfully processed ${teams.length} teams from ${req.files.length} screenshots`);

        res.json({
            success: true,
            data: {
                teams: teams,
                totalTeams: teams.length,
                totalImages: req.files.length,
                errors: errors,
                summary: generateTeamsSummary(teams)
            },
            message: `Successfully processed ${teams.length} teams from ${req.files.length} screenshots`
        });

    } catch (error) {
        console.error('Multiple screenshots processing error:', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process multiple screenshots'
        });
    }
});

// Bulk Team Analysis endpoint
app.post('/api/analyze/bulk-teams', async (req, res) => {
    try {
        console.log('Received bulk team analysis request');
        
        const { teams, matchDetails } = req.body;
        
        if (!teams || !Array.isArray(teams) || teams.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Teams array is required'
            });
        }

        if (!matchDetails || !matchDetails.teamA || !matchDetails.teamB || !matchDetails.matchDate) {
            return res.status(400).json({
                success: false,
                message: 'Match details (teamA, teamB, matchDate) are required'
            });
        }

        console.log(`Analyzing ${teams.length} teams for match: ${matchDetails.teamA} vs ${matchDetails.teamB}`);

        const analysisResults = [];
        const errors = [];

        // Analyze each team
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            try {
                console.log(`Analyzing team ${i + 1}/${teams.length}: ${team.teamName || `Team ${i + 1}`}`);
                
                const analysis = await analyzeSingleTeam(team, matchDetails);
                analysisResults.push({
                    teamId: team.teamId || i + 1,
                    teamName: team.teamName || `Team ${i + 1}`,
                    analysis: analysis,
                    players: team.players,
                    captain: team.captain,
                    vice_captain: team.vice_captain
                });
            } catch (error) {
                console.error(`Error analyzing team ${i + 1}:`, error);
                errors.push({
                    teamId: team.teamId || i + 1,
                    teamName: team.teamName || `Team ${i + 1}`,
                    error: error.message
                });
            }
        }

        // Generate comparative analysis
        const comparativeAnalysis = generateComparativeAnalysis(analysisResults, matchDetails);

        res.json({
            success: true,
            data: {
                individualAnalyses: analysisResults,
                comparativeAnalysis: comparativeAnalysis,
                summary: {
                    totalTeams: teams.length,
                    successfulAnalyses: analysisResults.length,
                    failedAnalyses: errors.length,
                    errors: errors
                }
            },
            message: `Successfully analyzed ${analysisResults.length} out of ${teams.length} teams`
        });

    } catch (error) {
        console.error('Bulk team analysis error:', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to analyze teams'
        });
    }
});

// Team Comparison and Recommendation endpoint
app.post('/api/compare-teams', strictLimiter, async (req, res) => {
    try {
        const { teams, matchDetails } = req.body;
        
        if (!teams || !Array.isArray(teams) || teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'At least 2 teams are required for comparison'
            });
        }

        if (!matchDetails || !matchDetails.teamA || !matchDetails.teamB || !matchDetails.matchDate) {
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

        console.log(`Comparing ${teams.length} teams for match: ${matchDetails.teamA} vs ${matchDetails.teamB}`);

        // Get match statistics for analysis
        const [teamFormData, headToHeadData, venueStatsData] = await Promise.all([
            fetchTeamFormData(matchDetails.teamA, matchDetails.teamB, matchDetails.matchDate),
            fetchHeadToHeadData(matchDetails.teamA, matchDetails.teamB, matchDetails.matchDate),
            fetchVenueStatsData(matchDetails.teamA, matchDetails.teamB, matchDetails.matchDate)
        ]);

        // Prepare team data for comparison
        const teamComparisons = teams.map((team, index) => {
            const composition = analyzeTeamComposition(team.players);
            return {
                teamId: team.teamId || index + 1,
                teamName: team.teamName || `Team ${index + 1}`,
                players: team.players,
                captain: team.captain,
                vice_captain: team.vice_captain,
                composition: composition,
                playerCount: team.players.length
            };
        });

        // Create comprehensive comparison prompt
        const prompt = `Analyze and compare these ${teams.length} Dream11 fantasy cricket teams for the match ${matchDetails.teamA} vs ${matchDetails.teamB} on ${formatDateForPrompt(matchDetails.matchDate)}.

**MATCH CONTEXT:**
${teamFormData ? `Recent Form: ${teamFormData}` : 'Recent form data not available'}
${headToHeadData ? `Head-to-Head: ${headToHeadData}` : 'Head-to-head data not available'}
${venueStatsData ? `Venue Stats: ${venueStatsData}` : 'Venue statistics not available'}

**TEAMS TO COMPARE:**

${teamComparisons.map((team, index) => `
**TEAM ${index + 1} (${team.teamName}):**
• Players: ${team.players.join(', ')}
• Captain: ${team.captain || 'Not selected'}
• Vice-Captain: ${team.vice_captain || 'Not selected'}
• Composition: ${team.composition.batsmen} batsmen, ${team.composition.bowlers} bowlers, ${team.composition.allRounders} all-rounders, ${team.composition.wicketKeepers} wicket-keepers
`).join('\n')}

**ANALYSIS REQUIREMENTS:**

1. **TEAM BALANCE COMPARISON** - Rate each team's balance (1-10)
2. **CAPTAINCY STRATEGY** - Evaluate captain/vice-captain choices
3. **VENUE ADAPTATION** - How well each team fits the venue conditions
4. **RISK ASSESSMENT** - Identify potential risks for each team
5. **WINNING PROBABILITY** - Rate each team's winning chances (1-10)

**RECOMMENDATION FORMAT:**

🏆 **WINNING TEAM RECOMMENDATION: TEAM X**
• **Rating: X/10**
• **Key Strengths:** [3 main strengths]
• **Risk Factors:** [2 main risks]
• **Why This Team:** [1-2 line explanation]

📊 **DETAILED COMPARISON:**
[Compare all teams side by side with ratings]

🎯 **STRATEGIC INSIGHTS:**
• [3 actionable insights for the recommended team]
• [2 alternative strategies if needed]

Keep the analysis concise but comprehensive. Focus on actionable insights that help increase winning probability.`;

        // Call OpenAI API for comparison
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert fantasy cricket analyst specializing in IPL Dream11 team comparisons. Provide data-driven insights with clear recommendations. Focus on team balance, venue strategy, captaincy choices, and risk assessment. Be decisive in your recommendations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1200,
            temperature: 0.7,
        });

        const comparisonAnalysis = completion.choices[0].message.content;

        // Format the response
        const formattedComparison = formatSummaryForMobile(comparisonAnalysis);

        res.json({
            success: true,
            comparison: formattedComparison,
            teamData: teamComparisons,
            matchContext: {
                teamForm: teamFormData,
                headToHead: headToHeadData,
                venueStats: venueStatsData
            },
            message: `Successfully compared ${teams.length} teams`
        });

    } catch (error) {
        console.error('Team comparison error:', error);

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
                message: 'Failed to compare teams. Please try again.'
            });
        }
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

// 1. Team Recent Form - Last 5 matches win/loss (Supabase)
app.post('/api/team-recent-form', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        console.log(`INFO: Finding recent form for ${teamA} and ${teamB} before ${matchDate}`);

        // Get team IDs for the specified teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'One or both teams not found in database'
            });
        }

        const teamIds = teams.map(t => t.team_id);

        // Get recent matches for both teams
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(`
                match_id,
                match_date,
                team1_id,
                team2_id,
                winner_team_id,
                teams!team1_id(team_name),
                teams_team2:teams!team2_id(team_name)
            `)
            .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
            .lt('match_date', matchDate)
            .order('match_date', { ascending: false })
            .limit(20); // Get more to ensure we have enough for both teams

        if (matchesError) throw matchesError;

        // Process matches for each team
        const teamAMatches = [];
        const teamBMatches = [];

        matches.forEach(match => {
            const isTeamAMatch = teams.find(t => t.team_name === teamA && 
                (t.team_id === match.team1_id || t.team_id === match.team2_id));
            const isTeamBMatch = teams.find(t => t.team_name === teamB && 
                (t.team_id === match.team1_id || t.team_id === match.team2_id));

            if (isTeamAMatch && teamAMatches.length < 5) {
                const result = !match.winner_team_id ? 'Draw' : 
                    (match.winner_team_id === isTeamAMatch.team_id ? 'Win' : 'Loss');
                teamAMatches.push({
                    match_id: match.match_id,
                    match_date: match.match_date,
                    team_name: teamA,
                    result: result
                });
            }

            if (isTeamBMatch && teamBMatches.length < 5) {
                const result = !match.winner_team_id ? 'Draw' : 
                    (match.winner_team_id === isTeamBMatch.team_id ? 'Win' : 'Loss');
                teamBMatches.push({
                    match_id: match.match_id,
                    match_date: match.match_date,
                    team_name: teamB,
                    result: result
                });
            }
        });

        console.log(`SUCCESS: Found ${teamAMatches.length} matches for ${teamA}, ${teamBMatches.length} matches for ${teamB}`);

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
            },
            supabaseQuery: true
        });

    } catch (error) {
        console.error('Team recent form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team recent form'
        });
    }
});

// 2. Head-to-Head between teams (Supabase) - Legacy endpoint 
app.post('/api/head-to-head', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        console.log(`INFO: Head-to-head between ${teamA} and ${teamB} before ${matchDate}`);

        // Get team IDs
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'One or both teams not found in database'
            });
        }

        const teamAId = teams.find(t => t.team_name === teamA)?.team_id;
        const teamBId = teams.find(t => t.team_name === teamB)?.team_id;

        // Last 5 years from match date
        const fiveYearsAgo = new Date(matchDate);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        // Get head-to-head matches using Supabase
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(`
                match_id,
                match_date,
                team1_id,
                team2_id,
                winner_team_id,
                teams_team1:teams!team1_id(team_name),
                teams_team2:teams!team2_id(team_name),
                teams_winner:teams!winner_team_id(team_name)
            `)
            .or(`and(team1_id.eq.${teamAId},team2_id.eq.${teamBId}),and(team1_id.eq.${teamBId},team2_id.eq.${teamAId})`)
            .lt('match_date', matchDate)
            .gte('match_date', fiveYearsAgo.toISOString().split('T')[0])
            .order('match_date', { ascending: false });

        if (matchesError) throw matchesError;

        // Calculate wins for each team
        const teamAWins = matches.filter(match => match.winner_team_id === teamAId).length;
        const teamBWins = matches.filter(match => match.winner_team_id === teamBId).length;
        const draws = matches.filter(match => !match.winner_team_id).length;

        // Format recent matches
        const recentMatches = matches.slice(0, 10).map(match => ({
            match_id: match.match_id,
            match_date: match.match_date,
            team1: match.teams_team1?.team_name || teamA,
            team2: match.teams_team2?.team_name || teamB,
            winner: match.teams_winner?.team_name || null
        }));

        console.log(`SUCCESS: Found ${matches.length} head-to-head matches in last 5 years`);

        res.json({
            success: true,
            data: {
                teamA: teamA,
                teamB: teamB,
                totalMatches: matches.length,
                teamAWins: teamAWins,
                teamBWins: teamBWins,
                draws: draws,
                recentMatches: recentMatches
            },
            supabaseQuery: true
        });

    } catch (error) {
        console.error('Head-to-head error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch head-to-head data'
        });
    }
});

// 3. Player Performance - Captain and Vice-Captain (Supabase)
app.post('/api/player-performance', async (req, res) => {
    try {
        const { captain, viceCaptain, matchDate } = req.body;

        if (!captain || !viceCaptain || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'captain, viceCaptain, and matchDate are required'
            });
        }

        console.log(`INFO: Getting player performance for ${captain} and ${viceCaptain} before ${matchDate}`);

        // Step 1: Get player IDs first
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('player_id, player_name')
            .in('player_name', [captain, viceCaptain]);

        if (playersError) {
            console.error('Players query error:', playersError);
            throw playersError;
        }

        if (!players || players.length === 0) {
            return res.json({
                success: true,
                data: {
                    captain: { name: captain, recentMatches: [] },
                    viceCaptain: { name: viceCaptain, recentMatches: [] }
                },
                message: 'No players found in database'
            });
        }

        const captainId = players.find(p => p.player_name === captain)?.player_id;
        const viceCaptainId = players.find(p => p.player_name === viceCaptain)?.player_id;

        // Step 2: Get matches before the specified date for ordering
        const { data: recentMatches, error: matchesError } = await supabase
            .from('matches')
            .select('match_id, match_date')
            .lt('match_date', matchDate)
            .order('match_date', { ascending: false })
            .limit(50); // Get enough recent matches to find player stats

        if (matchesError) {
            console.error('Matches query error:', matchesError);
            throw matchesError;
        }

        if (!recentMatches || recentMatches.length === 0) {
            return res.json({
                success: true,
                data: {
                    captain: { name: captain, recentMatches: [] },
                    viceCaptain: { name: viceCaptain, recentMatches: [] }
                },
                message: 'No recent matches found'
            });
        }

        const matchIds = recentMatches.map(m => m.match_id);

        // Step 3: Get player stats for these matches
        const { data: playerStats, error: statsError } = await supabase
            .from('player_match_stats')
            .select(`
                match_id,
                player_id,
                runs_scored,
                wickets_taken,
                balls_faced,
                strike_rate,
                economy_rate
            `)
            .in('match_id', matchIds)
            .in('player_id', [captainId, viceCaptainId].filter(Boolean));

        if (statsError) {
            console.error('Player stats query error:', statsError);
            throw statsError;
        }

        // Step 4: Process and sort the results
        const processPlayerStats = (playerId, playerName) => {
            if (!playerId) return [];
            
            const stats = playerStats
                .filter(stat => stat.player_id === playerId)
                .map(stat => {
                    const match = recentMatches.find(m => m.match_id === stat.match_id);
                    return {
                        match_id: stat.match_id,
                        match_date: match?.match_date,
                        player_name: playerName,
                        runs_scored: stat.runs_scored || 0,
                        wickets_taken: stat.wickets_taken || 0,
                        balls_faced: stat.balls_faced || 0,
                        strike_rate: stat.strike_rate || 0,
                        economy_rate: stat.economy_rate || 0
                    };
                })
                .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
                .slice(0, 5);
            
            return stats;
        };

        const captainStats = processPlayerStats(captainId, captain);
        const viceCaptainStats = processPlayerStats(viceCaptainId, viceCaptain);

        console.log(`✅ Found ${captainStats.length} matches for ${captain}, ${viceCaptainStats.length} matches for ${viceCaptain}`);

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
            },
            supabaseQuery: true
        });

    } catch (error) {
        console.error('Player performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch player performance data'
        });
    }
});

// 4. Venue Statistics (Supabase) - Multi-step approach replacing CTEs
app.post('/api/venue-stats', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }

        console.log(`🔍 Getting venue statistics for ${teamA} vs ${teamB} on ${matchDate}`);

        // Step 1: Find the match venue for the specified teams and date
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'One or both teams not found in database'
            });
        }

        const teamAId = teams.find(t => t.team_name === teamA)?.team_id;
        const teamBId = teams.find(t => t.team_name === teamB)?.team_id;

        // Find the match venue
        const { data: selectedMatch, error: matchError } = await supabase
            .from('matches')
            .select('venue_id, venues(venue_name, city)')
            .eq('match_date', matchDate)
            .or(`and(team1_id.eq.${teamAId},team2_id.eq.${teamBId}),and(team1_id.eq.${teamBId},team2_id.eq.${teamAId})`)
            .limit(1);

        if (matchError) throw matchError;

        if (!selectedMatch || selectedMatch.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: 'No match found for the specified date and teams',
                    venueStats: null
                }
            });
        }

        const venueId = selectedMatch[0].venue_id;
        const venueInfo = selectedMatch[0].venues;

        // Step 2: Get historical matches at this venue
        const { data: historicalMatches, error: historicalError } = await supabase
            .from('matches')
            .select('match_id')
            .eq('venue_id', venueId)
            .lt('match_date', matchDate);

        if (historicalError) throw historicalError;

        if (!historicalMatches || historicalMatches.length === 0) {
            return res.json({
                success: true,
                data: {
                    message: 'No historical data found for this venue',
                    venueStats: {
                        venue_name: venueInfo?.venue_name,
                        location: venueInfo?.city,
                        total_matches: 0,
                        avg_first_innings_score: 0,
                        avg_second_innings_score: 0,
                        total_wickets: 0
                    }
                }
            });
        }

        const matchIds = historicalMatches.map(m => m.match_id);

        // Step 3: Get team scores for these matches (simplified approach)
        const { data: teamScores, error: scoresError } = await supabase
            .from('player_match_stats')
            .select('match_id, team_id, runs_scored, wickets_taken')
            .in('match_id', matchIds);

        if (scoresError) throw scoresError;

        // Step 4: Calculate venue statistics
        const matchScores = {};
        teamScores.forEach(stat => {
            if (!matchScores[stat.match_id]) {
                matchScores[stat.match_id] = [];
            }
            matchScores[stat.match_id].push({
                team_id: stat.team_id,
                runs: stat.runs_scored || 0,
                wickets: stat.wickets_taken || 0
            });
        });

        // Calculate innings scores
        const firstInningsScores = [];
        const secondInningsScores = [];
        let totalWickets = 0;

        Object.values(matchScores).forEach(matchData => {
            // Group by team and sum runs
            const teamTotals = {};
            matchData.forEach(stat => {
                if (!teamTotals[stat.team_id]) {
                    teamTotals[stat.team_id] = { runs: 0, wickets: 0 };
                }
                teamTotals[stat.team_id].runs += stat.runs;
                teamTotals[stat.team_id].wickets += stat.wickets;
            });

            const teamScoreArray = Object.values(teamTotals);
            if (teamScoreArray.length >= 2) {
                firstInningsScores.push(teamScoreArray[0].runs);
                secondInningsScores.push(teamScoreArray[1].runs);
                totalWickets += teamScoreArray[0].wickets + teamScoreArray[1].wickets;
            }
        });

        const avgFirstInnings = firstInningsScores.length > 0 ? 
            Math.round((firstInningsScores.reduce((a, b) => a + b, 0) / firstInningsScores.length) * 100) / 100 : 0;
        const avgSecondInnings = secondInningsScores.length > 0 ? 
            Math.round((secondInningsScores.reduce((a, b) => a + b, 0) / secondInningsScores.length) * 100) / 100 : 0;

        console.log(`✅ Found venue stats for ${venueInfo?.venue_name}: ${historicalMatches.length} matches`);

        res.json({
            success: true,
            data: {
                venueStats: {
                    venue_name: venueInfo?.venue_name,
                    location: venueInfo?.city,
                    total_matches: historicalMatches.length,
                    avg_first_innings_score: avgFirstInnings,
                    avg_second_innings_score: avgSecondInnings,
                    total_wickets: totalWickets
                }
            },
            supabaseQuery: true
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

// Helper functions for fetching match data for team comparison
async function fetchTeamFormData(teamA, teamB, matchDate) {
    try {
        const response = await fetch(`http://localhost:3001/api/team-recent-form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamA, teamB, matchDate })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const teamA = data.data.teamA;
                const teamB = data.data.teamB;
                const teamAWins = teamA.matches.filter(m => m.result === 'Win').length;
                const teamBWins = teamB.matches.filter(m => m.result === 'Win').length;
                return `${teamA.name}: ${teamAWins}/5 wins, ${teamB.name}: ${teamBWins}/5 wins`;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching team form:', error);
        return null;
    }
}

async function fetchHeadToHeadData(teamA, teamB, matchDate) {
    try {
        const response = await fetch(`http://localhost:3001/api/matches/head-to-head`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamA, teamB, beforeDate: matchDate, limit: 5 })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const h2h = data.data;
                return `${h2h.teamA}: ${h2h.teamAWins} wins, ${h2h.teamB}: ${h2h.teamBWins} wins (last ${h2h.totalMatches} matches)`;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching head-to-head data:', error);
        return null;
    }
}

async function fetchVenueStatsData(teamA, teamB, matchDate) {
    try {
        const response = await fetch(`http://localhost:3001/api/venue-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamA, teamB, matchDate })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.venueStats) {
                const venue = data.data.venueStats;
                return `${venue.venue_name}: Avg score ${venue.avg_first_innings_score || 'N/A'}, ${venue.total_matches || 0} matches`;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching venue stats:', error);
        return null;
    }
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
    console.log(`Dream11 Analyzer Backend running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` OCR API: ${process.env.OCR_API_KEY ? 'Configured' : 'Missing'}`);
    console.log(` OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
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