const supabase = require('../services/supabaseClient');

exports.playerPerformance = async (req, res) => {
    try {
        const { captain, viceCaptain, matchDate } = req.body;
        if (!captain || !viceCaptain || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'captain, viceCaptain, and matchDate are required'
            });
        }
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('player_id, player_name, role')
            .in('player_name', [captain, viceCaptain]);
        if (playersError) throw playersError;
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
        const { data: recentMatches, error: matchesError } = await supabase
            .from('matches')
            .select('match_id, match_date')
            .lt('match_date', matchDate)
            .order('match_date', { ascending: false })
            .limit(50);
        if (matchesError) throw matchesError;
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
        const { data: playerStats, error: statsError } = await supabase
            .from('player_match_stats')
            .select('match_id, player_id, runs_scored, wickets_taken, balls_faced, strike_rate, economy_rate')
            .in('match_id', matchIds)
            .in('player_id', [captainId, viceCaptainId].filter(Boolean));
        if (statsError) throw statsError;
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch player performance data',
            error: error.message
        });
    }
}; 