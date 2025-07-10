const supabase = require('./supabaseClient');

async function getTeamRecentForm({ teamA, teamB, matchDate }) {
    if (!teamA || !teamB || !matchDate) {
        return { 
            success: false, 
            message: 'teamA, teamB, and matchDate are required' 
        };
    }

    try {
        console.log(`INFO: Finding recent form for ${teamA} and ${teamB} before ${matchDate}`);

        // Get team IDs for the specified teams
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);

        if (teamsError) throw teamsError;

        if (teams.length < 2) {
            return {
                success: false,
                message: 'One or both teams not found in database'
            };
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

        return {
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
        };

    } catch (error) {
        console.error('Team recent form error:', error);
        return {
            success: false,
            message: 'Failed to fetch team recent form',
            error: error.message
        };
    }
}

module.exports = { getTeamRecentForm }; 