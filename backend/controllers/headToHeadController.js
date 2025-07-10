const supabase = require('../services/supabaseClient');

exports.legacyHeadToHead = async (req, res) => {
    try {
        const { teamA, teamB, matchDate } = req.body;
        if (!teamA || !teamB || !matchDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and matchDate are required'
            });
        }
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);
        if (teamsError) throw teamsError;
        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: `One or both teams not found in database. Available teams: ${teams.map(t => t.team_name).join(', ')}`
            });
        }
        const teamAId = teams.find(t => t.team_name === teamA)?.team_id;
        const teamBId = teams.find(t => t.team_name === teamB)?.team_id;
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
        const teamAWins = matches.filter(match => match.winner_team_id === teamAId).length;
        const teamBWins = matches.filter(match => match.winner_team_id === teamBId).length;
        const draws = matches.filter(match => !match.winner_team_id).length;
        const allHistoricalMatches = matches.map(match => ({
            match_id: match.match_id,
            match_date: match.match_date,
            team1: match.teams_team1?.team_name || teamA,
            team2: match.teams_team2?.team_name || teamB,
            winner: match.teams_winner?.team_name || null
        }));
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch head-to-head data',
            error: error.message
        });
    }
};

exports.supabaseHeadToHead = async (req, res) => {
    try {
        const { teamA, teamB, beforeDate, limit = 5 } = req.body;
        if (!teamA || !teamB || !beforeDate) {
            return res.status(400).json({
                success: false,
                message: 'teamA, teamB, and beforeDate are required'
            });
        }
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);
        if (teamsError) throw teamsError;
        if (teams.length < 2) {
            return res.status(400).json({
                success: false,
                message: `One or both teams not found in database. Available teams: ${teams.map(t => t.team_name).join(', ')}`
            });
        }
        const teamAData = teams.find(t => t.team_name === teamA);
        const teamBData = teams.find(t => t.team_name === teamB);
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
        if (matchesError) throw matchesError;
        const teamAWins = matches.filter(match => match.winner_team_id === teamAData.team_id).length;
        const teamBWins = matches.filter(match => match.winner_team_id === teamBData.team_id).length;
        const draws = matches.filter(match => !match.winner_team_id).length;
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch head-to-head matches',
            error: error.message
        });
    }
}; 