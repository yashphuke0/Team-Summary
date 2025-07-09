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

console.log('🏏 Starting cricbuzz11 Team Analyzer Backend...');

// Supabase connection setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('teams').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connected successfully');
    } catch (err) {
        console.error('❌ ERROR: Supabase connection failed:', err.message);
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

    // Enhanced logic to ensure we try to get closer to 11 players
    let finalPlayers = uniquePlayers.map(p => p.name);
    
    // If we have less than 8 players, try more aggressive parsing
    if (finalPlayers.length < 8) {
        console.log(`⚠️ Only found ${finalPlayers.length} players, attempting more aggressive parsing...`);
        
        // Secondary pass with more lenient rules
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip if already processed
            if (finalPlayers.some(player => player.toLowerCase().includes(line.toLowerCase()) || line.toLowerCase().includes(player.toLowerCase()))) {
                continue;
            }
            
            // More lenient player name check
            if (line.length >= 3 && line.length <= 20 && 
                /^[A-Za-z\s\.\-']+$/.test(line) && 
                !/^(CSK|MI|RCB|KKR|DC|PBKS|RR|SRH|GT|LSG|BATTER|BOWLER|WICKET|KEEPER|ALL|ROUNDER)$/i.test(line)) {
                
                const cleanName = line.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
                if (cleanName.length >= 3 && !finalPlayers.includes(cleanName)) {
                    console.log(`SECONDARY: Additional player found: "${cleanName}"`);
                    finalPlayers.push(cleanName);
                    
                    if (finalPlayers.length >= 11) break;
                }
            }
        }
    }

    // Limit to 11 players max
    finalPlayers = finalPlayers.slice(0, 11);
    
    console.log(`🏏 FINAL RESULT: ${finalPlayers.length} players extracted for fantasy team validation`);
    finalPlayers.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player}`);
    });

    // Captain and vice-captain will be handled manually by the user
    const captain = '';
    const viceCaptain = '';

    return {
        players: finalPlayers,
        captain: captain,
        vice_captain: viceCaptain,
        playerDetails: uniquePlayers.slice(0, 11),
        extractedCount: finalPlayers.length,
        expectedCount: 11
    };
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'cricbuzz11 Team Analyzer Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
    });
});

// Get IPL teams (hardcoded)
app.get('/api/teams', (req, res) => {
    res.json({
        success: true,
        teams: iplTeams,
        message: 'IPL 2025 teams list'
    });
});

// ==============================================
// CRICBUZZ11 ENHANCED VALIDATION ENDPOINTS
// ==============================================

// Validate match exists in database
app.post('/api/validate-match', async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;

        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'Team A, Team B, and match date are required'
            });
        }

        if (teamA === teamB) {
            return res.status(400).json({
                success: false,
                message: 'Team A and Team B must be different'
            });
        }

        console.log(`🔍 Validating match: ${teamA} vs ${teamB} on ${matchDate}`);

        // Check if teams exist in database
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            const missingTeams = [teamA, teamB].filter(team => 
                !teams.find(t => t.team_name === team)
            );
            return res.status(400).json({
                success: false,
                message: `Teams not found in database: ${missingTeams.join(', ')}`,
                availableTeams: iplTeams
            });
        }

        // Check if specific match exists
        const teamIds = teams.map(t => t.team_id);
        const { data: matches, error: matchError } = await supabase
            .from('matches')
            .select('match_id, match_date, team1_id, team2_id')
            .eq('match_date', matchDate)
            .or(`and(team1_id.eq.${teamIds[0]},team2_id.eq.${teamIds[1]}),and(team1_id.eq.${teamIds[1]},team2_id.eq.${teamIds[0]})`);

        if (matchError) throw matchError;

        const matchExists = matches && matches.length > 0;

        if (matchExists) {
            console.log(`✅ Match found in database: ${teamA} vs ${teamB} on ${matchDate}`);
            res.json({
                success: true,
                matchExists: true,
                matchId: matches[0].match_id,
                message: `Match validated: ${teamA} vs ${teamB} on ${matchDate}`,
                teams: { teamA, teamB },
                matchDate
            });
        } else {
            console.log(`⚠️ Match not found in database, but teams are valid`);
            res.json({
                success: true,
                matchExists: false,
                message: `Match not found in database, but teams are valid. Proceeding with analysis using available data.`,
                teams: { teamA, teamB },
                matchDate,
                warning: 'Limited historical data available for this specific match'
            });
        }

    } catch (error) {
        console.error('❌ Match validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate match',
            error: error.message
        });
    }
});

// Validate players and provide suggestions
app.post('/api/validate-players', async (req, res) => {
    try {
        const { players, teamA, teamB } = req.body;

        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Players array is required'
            });
        }

        if (!teamA || !teamB) {
            return res.status(400).json({
                success: false,
                message: 'Team A and Team B are required for player validation'
            });
        }

        // Get team data
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Teams not found in database'
            });
        }

        const teamIds = teams.map(t => t.team_id);

        // Get active players for selected teams
        const { data: playerMatchData, error: matchStatsError } = await supabase
            .from('player_match_stats')
            .select(`
                player_id,
                team_id,
                players!inner(player_name, role, is_active)
            `)
            .in('team_id', teamIds)
            .eq('players.is_active', true);

        if (matchStatsError) throw matchStatsError;

        // Process to get unique players with their most frequent team
        const playerTeamCounts = {};
        
        playerMatchData.forEach(record => {
            const playerId = record.player_id;
            const teamId = record.team_id;
            
            if (!playerTeamCounts[playerId]) {
                playerTeamCounts[playerId] = {
                    player_name: record.players.player_name,
                    role: record.players.role,
                    teams: {}
                };
            }
            
            if (!playerTeamCounts[playerId].teams[teamId]) {
                playerTeamCounts[playerId].teams[teamId] = 0;
            }
            
            playerTeamCounts[playerId].teams[teamId]++;
        });

        // Create final player list with most frequent team assignment
        const playersWithTeams = Object.keys(playerTeamCounts).map(playerId => {
            const playerData = playerTeamCounts[playerId];
            const teamCounts = playerData.teams;
            
            // Find most frequent team
            const mostFrequentTeamId = Object.keys(teamCounts).reduce((a, b) => 
                teamCounts[a] > teamCounts[b] ? a : b
            );
            
            const playerTeam = teams.find(team => team.team_id === parseInt(mostFrequentTeamId));
            
            return {
                player_id: parseInt(playerId),
                player_name: playerData.player_name,
                role: playerData.role,
                team_id: parseInt(mostFrequentTeamId),
                team_name: playerTeam ? playerTeam.team_name : 'Unknown Team',
                match_count: teamCounts[mostFrequentTeamId]
            };
        });

        // Ensure exactly 11 players for fantasy cricket team
        const processedPlayers = players.slice(0, 11);
        while (processedPlayers.length < 11) {
            processedPlayers.push(`Player ${processedPlayers.length + 1} (Missing)`);
        }

        // Validate each player and provide suggestions
        const validationResults = processedPlayers.map(playerName => {
            const trimmedName = playerName.trim();
            
            // Skip empty or placeholder names
            if (!trimmedName || trimmedName.includes('(Missing)')) {
                return {
                    inputName: playerName,
                    validatedName: null,
                    playerId: null,
                    role: null,
                    team: null,
                    isValid: false,
                    confidence: 0,
                    suggestions: [],
                    isMissing: true
                };
            }
            
            // Exact match
            const exactMatch = playersWithTeams.find(p => 
                p.player_name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (exactMatch) {
                return {
                    inputName: playerName,
                    validatedName: exactMatch.player_name,
                    playerId: exactMatch.player_id,
                    role: exactMatch.role,
                    team: exactMatch.team_name,
                    isValid: true,
                    confidence: 1.0
                };
            }

            // Fuzzy match - find similar names
            const suggestions = playersWithTeams
                .map(p => ({
                    ...p,
                    similarity: calculateSimilarity(trimmedName.toLowerCase(), p.player_name.toLowerCase())
                }))
                .filter(p => p.similarity > 0.3) // Lower threshold for better suggestions
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5); // Show top 5 suggestions

            // Auto-replace if high confidence match (80%+ similarity)
            if (suggestions.length > 0 && suggestions[0].similarity >= 0.8) {
                const bestMatch = suggestions[0];
                return {
                    inputName: playerName,
                    validatedName: bestMatch.player_name,
                    playerId: bestMatch.player_id,
                    role: bestMatch.role,
                    team: bestMatch.team_name,
                    isValid: true,
                    confidence: bestMatch.similarity,
                    autoReplaced: true
                };
            }

            // Convert suggestions to format expected by frontend
            const formattedSuggestions = suggestions.map(p => ({
                playerId: p.player_id,
                playerName: p.player_name,
                role: p.role,
                team: p.team_name,
                similarity: p.similarity
            }));

            return {
                inputName: playerName,
                validatedName: null,
                playerId: null,
                role: null,
                team: null,
                isValid: false,
                confidence: 0,
                suggestions: formattedSuggestions
            };
        });

        const validPlayers = validationResults.filter(p => p.isValid);
        const invalidPlayers = validationResults.filter(p => !p.isValid && !p.isMissing);
        const missingPlayers = validationResults.filter(p => p.isMissing);

        res.json({
            success: true,
            totalPlayers: 11, // Always 11 for fantasy cricket
            extractedPlayers: players.length, // Actual extracted count
            validPlayers: validPlayers.length,
            invalidPlayers: invalidPlayers.length,
            missingPlayers: missingPlayers.length,
            validationResults,
            message: `Validated ${validPlayers.length} out of 11 players${missingPlayers.length > 0 ? ` (${missingPlayers.length} missing from screenshot)` : ''}`,
            requiresCorrection: invalidPlayers.length > 0 || missingPlayers.length > 0,
            availablePlayersCount: playersWithTeams.length,
            availablePlayers: playersWithTeams.sort((a, b) => a.player_name.localeCompare(b.player_name))
        });

    } catch (error) {
        console.error('❌ Player validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate players',
            error: error.message
        });
    }
});

// Helper function for string similarity
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Levenshtein distance
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

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

// DEBUG: Check players for specific teams
app.post('/api/debug/players', async (req, res) => {
    try {
        const { teamA, teamB } = req.body;
        
        console.log(`🔍 DEBUG: Checking players for teams: ${teamA}, ${teamB}`);
        
        // Get team IDs
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        console.log('Found teams:', teams);

        if (teams.length === 0) {
            return res.json({
                success: false,
                message: 'No teams found',
                availableTeams: [],
                players: []
            });
        }

        const teamIds = teams.map(t => t.team_id);
        console.log('Team IDs:', teamIds);

        // Get players who have actually played for these teams using player_match_stats
        const { data: playerMatchData, error: matchStatsError } = await supabase
            .from('player_match_stats')
            .select(`
                player_id,
                team_id,
                players!inner(player_name, role, is_active)
            `)
            .in('team_id', teamIds)
            .eq('players.is_active', true);

        if (matchStatsError) throw matchStatsError;

        console.log(`Found ${playerMatchData.length} player-match records`);

        // Process to get unique players with their most frequent team
        const playerTeamCounts = {};
        
        playerMatchData.forEach(record => {
            const playerId = record.player_id;
            const teamId = record.team_id;
            
            if (!playerTeamCounts[playerId]) {
                playerTeamCounts[playerId] = {
                    player_name: record.players.player_name,
                    role: record.players.role,
                    teams: {}
                };
            }
            
            if (!playerTeamCounts[playerId].teams[teamId]) {
                playerTeamCounts[playerId].teams[teamId] = 0;
            }
            
            playerTeamCounts[playerId].teams[teamId]++;
        });

        // Create final player list
        const playersWithTeams = Object.keys(playerTeamCounts).map(playerId => {
            const playerData = playerTeamCounts[playerId];
            const teamCounts = playerData.teams;
            
            // Find most frequent team
            const mostFrequentTeamId = Object.keys(teamCounts).reduce((a, b) => 
                teamCounts[a] > teamCounts[b] ? a : b
            );
            
            const playerTeam = teams.find(team => team.team_id === parseInt(mostFrequentTeamId));
            
            return {
                player_id: parseInt(playerId),
                player_name: playerData.player_name,
                role: playerData.role,
                team_id: parseInt(mostFrequentTeamId),
                team_name: playerTeam ? playerTeam.team_name : 'Unknown Team',
                match_count: teamCounts[mostFrequentTeamId]
            };
        });

        console.log(`Processed ${playersWithTeams.length} unique players`);

        res.json({
            success: true,
            teams: teams,
            players: playersWithTeams,
            totalPlayers: playersWithTeams.length,
            message: `Found ${playersWithTeams.length} players for the selected teams`
        });

    } catch (error) {
        console.error('❌ DEBUG players error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch players',
            error: error.message
        });
    }
});

// DEBUG: Check all players in database
app.get('/api/debug/all-players', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Checking ALL players in database...');
        
        // Get total count of all players
        const { data: allPlayers, error: playersError } = await supabase
            .from('players')
            .select('player_id, player_name, role, team_id, is_active')
            .limit(20); // Limit to first 20 for testing

        if (playersError) throw playersError;

        console.log(`Found ${allPlayers ? allPlayers.length : 0} players total`);

        // Get active players count
        const { data: activePlayers, error: activeError } = await supabase
            .from('players')
            .select('player_id, player_name, role, team_id')
            .eq('is_active', true)
            .limit(20);

        if (activeError) throw activeError;

        res.json({
            success: true,
            totalPlayersInDB: allPlayers ? allPlayers.length : 0,
            activePlayersInDB: activePlayers ? activePlayers.length : 0,
            samplePlayers: allPlayers || [],
            sampleActivePlayers: activePlayers || [],
            message: `Database check: ${allPlayers ? allPlayers.length : 0} total players, ${activePlayers ? activePlayers.length : 0} active players`
        });

    } catch (error) {
        console.error('❌ DEBUG all players error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch all players',
            error: error.message
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

        // Get ALL head-to-head matches (no time limit)
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
            .order('match_date', { ascending: false });

        if (matchesError) throw matchesError;

        // Calculate wins for each team
        const teamAWins = matches.filter(match => match.winner_team_id === teamAId).length;
        const teamBWins = matches.filter(match => match.winner_team_id === teamBId).length;
        const draws = matches.filter(match => !match.winner_team_id).length;

        // Format ALL historical matches (not just recent)
        const allHistoricalMatches = matches.map(match => ({
            match_id: match.match_id,
            match_date: match.match_date,
            team1: match.teams_team1?.team_name || teamA,
            team2: match.teams_team2?.team_name || teamB,
            winner: match.teams_winner?.team_name || null
        }));

        console.log(`SUCCESS: Found ${matches.length} total head-to-head matches`);

        res.json({
            success: true,
            data: {
                teamA: teamA,
                teamB: teamB,
                totalMatches: matches.length,
                teamAWins: teamAWins,
                teamBWins: teamBWins,
                draws: draws,
                allHistoricalMatches: allHistoricalMatches
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

        // Step 1: Get player IDs and roles first
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('player_id, player_name, role')
            .in('player_name', [captain, viceCaptain]);

        if (playersError) {
            console.error('Players query error:', playersError);
            throw playersError;
        }

        if (!players || players.length === 0) {
            return res.json({
                success: true,
                data: {
                    captain: { name: captain, role: 'unknown', recentMatches: [] },
                    viceCaptain: { name: viceCaptain, role: 'unknown', recentMatches: [] }
                },
                message: 'No players found in database'
            });
        }

        const captainData = players.find(p => p.player_name === captain);
        const viceCaptainData = players.find(p => p.player_name === viceCaptain);
        const captainId = captainData?.player_id;
        const viceCaptainId = viceCaptainData?.player_id;

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

        // Step 4: Process and sort the results with role-based filtering
        const processPlayerStats = (playerId, playerName, playerRole) => {
            if (!playerId) return [];
            
            const stats = playerStats
                .filter(stat => stat.player_id === playerId)
                .map(stat => {
                    const match = recentMatches.find(m => m.match_id === stat.match_id);
                    return {
                        match_id: stat.match_id,
                        match_date: match?.match_date,
                        player_name: playerName,
                        role: playerRole,
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

        const captainStats = processPlayerStats(captainId, captain, captainData?.role || 'unknown');
        const viceCaptainStats = processPlayerStats(viceCaptainId, viceCaptain, viceCaptainData?.role || 'unknown');

        console.log(`✅ Found ${captainStats.length} matches for ${captain}, ${viceCaptainStats.length} matches for ${viceCaptain}`);

        res.json({
            success: true,
            data: {
                captain: {
                    name: captain,
                    role: captainData?.role || 'unknown',
                    recentMatches: captainStats
                },
                viceCaptain: {
                    name: viceCaptain,
                    role: viceCaptainData?.role || 'unknown',
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

        // Enhanced pitch analysis logic
        const avgScore = (avgFirstInnings + avgSecondInnings) / 2;
        const avgWicketsPerMatch = historicalMatches.length > 0 ? totalWickets / historicalMatches.length : 0;
        
        // Determine pitch type based on multiple factors
        let pitchType = 'neutral';
        let pitchRating = 'balanced';
        
        if (avgScore >= 180 && avgWicketsPerMatch <= 12) {
            pitchType = 'batting';
            pitchRating = 'high-scoring batting paradise';
        } else if (avgScore >= 160 && avgWicketsPerMatch <= 14) {
            pitchType = 'batting';
            pitchRating = 'good for batting';
        } else if (avgScore <= 140 && avgWicketsPerMatch >= 16) {
            pitchType = 'bowling';
            pitchRating = 'bowler-friendly surface';
        } else if (avgScore <= 150 && avgWicketsPerMatch >= 15) {
            pitchType = 'bowling';
            pitchRating = 'assists bowlers';
        } else {
            pitchType = 'neutral';
            pitchRating = 'balanced conditions';
        }

        // Calculate chase success rate
        const chaseAttempts = secondInningsScores.length;
        const successfulChases = secondInningsScores.filter((score, index) => 
            score > firstInningsScores[index]
        ).length;
        const chaseSuccessRate = chaseAttempts > 0 ? 
            Math.round((successfulChases / chaseAttempts) * 100) : 0;

        // Step 5: Get team-specific performance at this venue
        const { data: teamVenueMatches, error: teamVenueError } = await supabase
            .from('matches')
            .select(`
                match_id,
                team1_id,
                team2_id,
                winner_team_id,
                match_date
            `)
            .eq('venue_id', venueId)
            .or(`team1_id.eq.${teamAId},team2_id.eq.${teamAId},team1_id.eq.${teamBId},team2_id.eq.${teamBId}`)
            .lt('match_date', matchDate);

        if (teamVenueError) throw teamVenueError;

        // Calculate team-specific stats
        const teamAMatches = teamVenueMatches?.filter(m => 
            m.team1_id === teamAId || m.team2_id === teamAId
        ) || [];
        const teamBMatches = teamVenueMatches?.filter(m => 
            m.team1_id === teamBId || m.team2_id === teamBId
        ) || [];

        const teamAWinsAtVenue = teamAMatches.filter(m => m.winner_team_id === teamAId).length;
        const teamBWinsAtVenue = teamBMatches.filter(m => m.winner_team_id === teamBId).length;

        const teamAVenueRecord = `${teamAWinsAtVenue}/${teamAMatches.length}`;
        const teamBVenueRecord = `${teamBWinsAtVenue}/${teamBMatches.length}`;

        console.log(`✅ Found venue stats for ${venueInfo?.venue_name}: ${historicalMatches.length} matches, ${pitchType} pitch`);

        res.json({
            success: true,
            data: {
                venueStats: {
                    venue_name: venueInfo?.venue_name,
                    location: venueInfo?.city,
                    total_matches: historicalMatches.length,
                    avg_first_innings_score: avgFirstInnings,
                    avg_second_innings_score: avgSecondInnings,
                    avg_total_score: avgScore,
                    total_wickets: totalWickets,
                    avg_wickets_per_match: Math.round(avgWicketsPerMatch * 100) / 100,
                    pitch_type: pitchType,
                    pitch_rating: pitchRating,
                    chase_success_rate: chaseSuccessRate,
                    toss_decision_suggestion: chaseSuccessRate >= 60 ? 'field first' : 'bat first',
                    team_venue_performance: {
                        [teamA]: {
                            matches: teamAMatches.length,
                            wins: teamAWinsAtVenue,
                            record: teamAVenueRecord,
                            win_percentage: teamAMatches.length > 0 ? Math.round((teamAWinsAtVenue / teamAMatches.length) * 100) : 0
                        },
                        [teamB]: {
                            matches: teamBMatches.length,
                            wins: teamBWinsAtVenue,
                            record: teamBVenueRecord,
                            win_percentage: teamBMatches.length > 0 ? Math.round((teamBWinsAtVenue / teamBMatches.length) * 100) : 0
                        }
                    }
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
    console.log('🏏 ===================================');
    console.log('🏏  cricbuzz11 Team Analyzer Backend  ');
    console.log('🏏 ===================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 OCR API: ${process.env.OCR_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
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