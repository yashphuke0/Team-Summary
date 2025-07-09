const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePlayerTeams() {
    console.log('🔧 Starting player team assignment update...');
    
    try {
        // Step 1: Get player-team relationships from player_match_stats
        console.log('📊 Analyzing player-team relationships from match stats...');
        
        const { data: playerStats, error: statsError } = await supabase
            .from('player_match_stats')
            .select('player_id, team_id')
            .not('player_id', 'is', null)
            .not('team_id', 'is', null);

        if (statsError) {
            throw statsError;
        }

        console.log(`Found ${playerStats.length} player-team stat records`);

        // Step 2: Group by player_id to find most common team
        const playerTeamCounts = {};
        
        playerStats.forEach(stat => {
            const playerId = stat.player_id;
            const teamId = stat.team_id;
            
            if (!playerTeamCounts[playerId]) {
                playerTeamCounts[playerId] = {};
            }
            
            if (!playerTeamCounts[playerId][teamId]) {
                playerTeamCounts[playerId][teamId] = 0;
            }
            
            playerTeamCounts[playerId][teamId]++;
        });

        // Step 3: Determine primary team for each player
        const playerTeamAssignments = {};
        let conflictCount = 0;

        Object.keys(playerTeamCounts).forEach(playerId => {
            const teamCounts = playerTeamCounts[playerId];
            const teams = Object.keys(teamCounts);
            
            if (teams.length === 1) {
                // Player only played for one team
                playerTeamAssignments[playerId] = parseInt(teams[0]);
            } else {
                // Player played for multiple teams, pick the most frequent
                const mostFrequentTeam = teams.reduce((a, b) => 
                    teamCounts[a] > teamCounts[b] ? a : b
                );
                playerTeamAssignments[playerId] = parseInt(mostFrequentTeam);
                conflictCount++;
                console.log(`⚠️ Conflict resolved for player ${playerId}: chose team ${mostFrequentTeam}`);
            }
        });

        console.log(`📈 Analysis complete:`);
        console.log(`   - ${Object.keys(playerTeamAssignments).length} players analyzed`);
        console.log(`   - ${conflictCount} conflicts resolved`);

        // Step 4: Update players table
        console.log('🔄 Updating players table...');
        
        let updateCount = 0;
        let errorCount = 0;

        for (const [playerId, teamId] of Object.entries(playerTeamAssignments)) {
            try {
                const { error: updateError } = await supabase
                    .from('players')
                    .update({ team_id: teamId })
                    .eq('player_id', playerId)
                    .is('team_id', null); // Only update if team_id is currently null

                if (updateError) {
                    console.error(`Error updating player ${playerId}:`, updateError);
                    errorCount++;
                } else {
                    updateCount++;
                    if (updateCount <= 10) {
                        console.log(`✅ Updated player ${playerId} -> team ${teamId}`);
                    }
                }
            } catch (err) {
                console.error(`Exception updating player ${playerId}:`, err);
                errorCount++;
            }
        }

        console.log(`📊 Update summary:`);
        console.log(`   - ${updateCount} players updated successfully`);
        console.log(`   - ${errorCount} errors occurred`);

        // Step 5: Verify results
        console.log('🔍 Verifying results...');
        
        const { data: updatedPlayers, error: verifyError } = await supabase
            .from('players')
            .select('team_id')
            .not('team_id', 'is', null);

        if (verifyError) {
            throw verifyError;
        }

        console.log(`✅ Verification: ${updatedPlayers.length} players now have team assignments`);

        // Step 6: Show team distribution
        const { data: teamDistribution, error: distError } = await supabase
            .from('players')
            .select(`
                team_id,
                teams!inner(team_name)
            `)
            .not('team_id', 'is', null)
            .eq('is_active', true);

        if (distError) {
            throw distError;
        }

        const teamCounts = {};
        teamDistribution.forEach(player => {
            const teamName = player.teams.team_name;
            teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
        });

        console.log('🏏 Player distribution by team:');
        Object.entries(teamCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([team, count]) => {
                console.log(`   ${team}: ${count} players`);
            });

        console.log('🎉 Player team assignment update completed successfully!');

    } catch (error) {
        console.error('❌ Error updating player teams:', error);
        throw error;
    }
}

async function main() {
    try {
        await updatePlayerTeams();
        process.exit(0);
    } catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }
}

main(); 