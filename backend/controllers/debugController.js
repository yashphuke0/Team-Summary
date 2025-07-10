const supabase = require('../services/supabaseClient');

exports.debugPlayers = async (req, res) => {
    try {
        const { teamA, teamB } = req.body;
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .in('team_name', [teamA, teamB]);
        if (teamsError) throw teamsError;
        if (teams.length === 0) {
            return res.json({
                success: false,
                message: 'No teams found',
                availableTeams: [],
                players: []
            });
        }
        const teamIds = teams.map(t => t.team_id);
        const { data: playerMatchData, error: matchStatsError } = await supabase
            .from('player_match_stats')
            .select('player_id, team_id, players!inner(player_name, role, is_active)')
            .in('team_id', teamIds)
            .eq('players.is_active', true);
        if (matchStatsError) throw matchStatsError;
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
        const playersWithTeams = Object.keys(playerTeamCounts).map(playerId => {
            const playerData = playerTeamCounts[playerId];
            const teamCounts = playerData.teams;
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
        res.json({
            success: true,
            teams: teams,
            players: playersWithTeams,
            totalPlayers: playersWithTeams.length,
            message: `Found ${playersWithTeams.length} players for the selected teams`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch players',
            error: error.message
        });
    }
};

exports.debugAllPlayers = async (req, res) => {
    try {
        const { data: allPlayers, error: playersError } = await supabase
            .from('players')
            .select('player_id, player_name, role, team_id, is_active')
            .limit(20);
        if (playersError) throw playersError;
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch all players',
            error: error.message
        });
    }
}; 