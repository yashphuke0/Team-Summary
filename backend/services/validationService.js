const supabase = require('./supabaseClient');

// Helper: Get recent players for a team from their last 10 matches
async function getRecentPlayersForTeam(teamId, matchLimit = 10) {
    // Step 1: Get recent match IDs
    const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('match_id')
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
        .order('match_date', { ascending: false })
        .limit(matchLimit);
    if (matchError || !matches || matches.length === 0) return [];
    const matchIds = matches.map(m => m.match_id);
    // Step 2: Get players from those matches
    const { data: playerRows, error: playerError } = await supabase
        .from('player_match_stats')
        .select('player_id, team_id, players!inner(player_name, role, is_active)')
        .in('match_id', matchIds)
        .eq('team_id', teamId);
    if (playerError || !playerRows) return [];
    // Only unique players
    const seen = new Set();
    const uniquePlayers = [];
    for (const row of playerRows) {
        if (!seen.has(row.player_id)) {
            seen.add(row.player_id);
            uniquePlayers.push({
                player_id: row.player_id,
                player_name: row.players.player_name,
                role: row.players.role,
                team_id: row.team_id
            });
        }
    }
    return uniquePlayers;
}

async function validateMatch({ teamA, teamB, matchDate }) {
    if (!teamA || !teamB || !matchDate) {
        return {
            success: false,
            message: 'Team A, Team B, and match date are required'
        };
    }
    if (teamA === teamB) {
        return {
            success: false,
            message: 'Team A and Team B must be different'
        };
    }
    // Check if teams exist in database
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .in('team_name', [teamA, teamB]);
    if (teamsError) throw teamsError;
    if (teams.length < 2) {
        const missingTeams = [teamA, teamB].filter(team => !teams.find(t => t.team_name === team));
        return {
            success: false,
            message: `Teams not found in database: ${missingTeams.join(', ')}`
        };
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
    
    if (!matchExists) {
        return {
            success: false,
            matchExists: false,
            message: `No match found between ${teamA} and ${teamB} on ${matchDate}. Please check the date and teams.`,
            teams: { teamA, teamB },
            matchDate
        };
    }
    
    return {
        success: true,
        matchExists: true,
        matchId: matches[0].match_id,
        message: `Match validated: ${teamA} vs ${teamB} on ${matchDate}`,
        teams: { teamA, teamB },
        matchDate
    };
}

async function validatePlayers({ players, teamA, teamB }) {
    if (!players || !Array.isArray(players) || players.length === 0) {
        return {
            success: false,
            message: 'Players array is required'
        };
    }
    if (!teamA || !teamB) {
        return {
            success: false,
            message: 'Team A and Team B are required for player validation'
        };
    }
    // Debug: Log input teams
    console.log('VALIDATE: teamA =', teamA, ', teamB =', teamB);
    // Get team data
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .in('team_name', [teamA, teamB]);
    if (teamsError) throw teamsError;
    // Debug: Log fetched teams
    console.log('VALIDATE: fetched teams =', teams.map(t => `${t.team_name} (ID: ${t.team_id})`).join(', '));
    if (teams.length < 2) {
        return {
            success: false,
            message: 'Teams not found in database'
        };
    }
    const teamIds = teams.map(t => t.team_id);
    // Debug: Log team IDs
    console.log('VALIDATE: team IDs =', teamIds);
    // Get active players for selected teams (full pool for validation)
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
    // Debug: Log number of players fetched and a sample
    console.log('VALIDATE: fetched', playerMatchData.length, 'player records');
    if (playerMatchData.length > 0) {
        console.log('VALIDATE: sample players:', playerMatchData.slice(0, 10).map(p => `${p.players.player_name} (${p.team_id})`).join(', '));
    }
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
    // Fetch recent players for each team for suggestions
    const recentPlayersByTeam = {};
    for (const t of teams) {
        recentPlayersByTeam[t.team_id] = await getRecentPlayersForTeam(t.team_id, 10);
    }
    // Validate each player and provide suggestions
    const processedPlayers = players;
    const validationResults = processedPlayers.map(playerName => {
        const trimmedName = playerName.trim();
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
        // Fuzzy match - use only recent players for suggestions
        let suggestions = [];
        for (const t of teams) {
            const recentPlayers = recentPlayersByTeam[t.team_id] || [];
            const teamSuggestions = recentPlayers
                .map(p => ({
                    ...p,
                    similarity: calculateSimilarity(trimmedName.toLowerCase(), p.player_name.toLowerCase())
                }))
                .filter(p => p.similarity > 0.3);
            suggestions = suggestions.concat(teamSuggestions);
        }
        
        // Sort all suggestions by similarity (highest first)
        suggestions.sort((a, b) => b.similarity - a.similarity);
        
        // Auto-replace if high confidence match (85%+ similarity)
        if (suggestions.length > 0 && suggestions[0].similarity >= 0.85) {
            const bestMatch = suggestions[0];
            return {
                inputName: playerName,
                validatedName: bestMatch.player_name,
                playerId: bestMatch.player_id,
                role: bestMatch.role,
                team: teams.find(t => t.team_id === bestMatch.team_id)?.team_name || null,
                isValid: true,
                confidence: bestMatch.similarity,
                autoReplaced: true
            };
        }
        
        // Convert suggestions to format expected by frontend (already sorted by similarity)
        const formattedSuggestions = suggestions.slice(0, 5).map(p => ({
            playerId: p.player_id,
            playerName: p.player_name,
            role: p.role,
            team: teams.find(t => t.team_id === p.team_id)?.team_name || null,
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
    return {
        success: true,
        totalPlayers: processedPlayers.length,
        extractedPlayers: players.length,
        validPlayers: validPlayers.length,
        invalidPlayers: invalidPlayers.length,
        missingPlayers: missingPlayers.length,
        validationResults,
        message: `Validated ${validPlayers.length} out of ${processedPlayers.length} players${missingPlayers.length > 0 ? ` (${missingPlayers.length} missing from screenshot)` : ''}`,
        requiresCorrection: invalidPlayers.length > 0 || missingPlayers.length > 0,
        availablePlayersCount: playersWithTeams.length,
        availablePlayers: playersWithTeams.sort((a, b) => a.player_name.localeCompare(b.player_name))
    };
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
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

module.exports = { validateMatch, validatePlayers }; 