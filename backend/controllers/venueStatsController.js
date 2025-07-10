const supabase = require('../services/supabaseClient');

exports.venueStats = async (req, res) => {
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
                message: 'One or both teams not found in database'
            });
        }
        const teamAId = teams.find(t => t.team_name === teamA)?.team_id;
        const teamBId = teams.find(t => t.team_name === teamB)?.team_id;
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
        const { data: teamScores, error: scoresError } = await supabase
            .from('player_match_stats')
            .select('match_id, team_id, runs_scored, wickets_taken')
            .in('match_id', matchIds);
        if (scoresError) throw scoresError;
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
        const firstInningsScores = [];
        const secondInningsScores = [];
        let totalWickets = 0;
        Object.values(matchScores).forEach(matchData => {
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
        const avgScore = (avgFirstInnings + avgSecondInnings) / 2;
        const avgWicketsPerMatch = historicalMatches.length > 0 ? totalWickets / historicalMatches.length : 0;
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
        const chaseAttempts = secondInningsScores.length;
        const successfulChases = secondInningsScores.filter((score, index) =>
            score > firstInningsScores[index]
        ).length;
        const chaseSuccessRate = chaseAttempts > 0 ?
            Math.round((successfulChases / chaseAttempts) * 100) : 0;
        const { data: teamVenueMatches, error: teamVenueError } = await supabase
            .from('matches')
            .select('match_id, team1_id, team2_id, winner_team_id, match_date')
            .eq('venue_id', venueId)
            .or(`team1_id.eq.${teamAId},team2_id.eq.${teamAId},team1_id.eq.${teamBId},team2_id.eq.${teamBId}`)
            .lt('match_date', matchDate);
        if (teamVenueError) throw teamVenueError;
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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch venue statistics',
            error: error.message
        });
    }
}; 