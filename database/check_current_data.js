const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkDatabaseData() {
    console.log('🔍 Checking current data in Supabase database...\n');

    try {
        // Check teams table
        console.log('📊 TEAMS TABLE:');
        const { data: teams, error: teamsError } = await supabase
            .from('teams')
            .select('*')
            .limit(5);
        
        if (teamsError) {
            console.error('❌ Teams error:', teamsError);
        } else {
            console.log(`✅ Teams found: ${teams?.length || 0} records`);
            if (teams?.length > 0) {
                console.log('Sample team:', teams[0]);
            }
        }
        console.log('');

        // Check venues table
        console.log('🏟️ VENUES TABLE:');
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select('*')
            .limit(5);
        
        if (venuesError) {
            console.error('❌ Venues error:', venuesError);
        } else {
            console.log(`✅ Venues found: ${venues?.length || 0} records`);
            if (venues?.length > 0) {
                console.log('Sample venue:', venues[0]);
            }
        }
        console.log('');

        // Check players table
        console.log('👥 PLAYERS TABLE:');
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .limit(5);
        
        if (playersError) {
            console.error('❌ Players error:', playersError);
        } else {
            console.log(`✅ Players found: ${players?.length || 0} records`);
            if (players?.length > 0) {
                console.log('Sample player:', players[0]);
            }
        }
        console.log('');

        // Check matches table
        console.log('🏏 MATCHES TABLE:');
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select('*')
            .limit(5);
        
        if (matchesError) {
            console.error('❌ Matches error:', matchesError);
        } else {
            console.log(`✅ Matches found: ${matches?.length || 0} records`);
            if (matches?.length > 0) {
                console.log('Sample match:', matches[0]);
            }
        }
        console.log('');

        // Check player_match_stats table
        console.log('📈 PLAYER_MATCH_STATS TABLE:');
        const { data: playerStats, error: statsError } = await supabase
            .from('player_match_stats')
            .select('*')
            .limit(5);
        
        if (statsError) {
            console.error('❌ Player stats error:', statsError);
        } else {
            console.log(`✅ Player stats found: ${playerStats?.length || 0} records`);
            if (playerStats?.length > 0) {
                console.log('Sample player stat:', playerStats[0]);
            }
        }
        console.log('');

        // Check ball_by_ball table
        console.log('⚾ BALL_BY_BALL TABLE:');
        const { data: ballData, error: ballError } = await supabase
            .from('ball_by_ball')
            .select('*')
            .limit(5);
        
        if (ballError) {
            console.error('❌ Ball by ball error:', ballError);
        } else {
            console.log(`✅ Ball by ball data found: ${ballData?.length || 0} records`);
            if (ballData?.length > 0) {
                console.log('Sample ball data:', ballData[0]);
            }
        }
        console.log('');

        // Test a sample query for team recent form
        console.log('🧪 TESTING SAMPLE QUERIES:');
        console.log('Testing team recent form for Mumbai Indians...');
        
        const { data: sampleTeam, error: sampleError } = await supabase
            .from('teams')
            .select('team_id, team_name')
            .eq('team_name', 'Mumbai Indians')
            .limit(1);
            
        if (sampleError) {
            console.error('❌ Sample team query error:', sampleError);
        } else if (sampleTeam?.length > 0) {
            console.log('✅ Sample team found:', sampleTeam[0]);
            
            // Try to find matches for this team
            const { data: sampleMatches, error: matchError } = await supabase
                .from('matches')
                .select('match_id, match_date, team1_id, team2_id, winner_team_id')
                .or(`team1_id.eq.${sampleTeam[0].team_id},team2_id.eq.${sampleTeam[0].team_id}`)
                .limit(5);
                
            if (matchError) {
                console.error('❌ Sample matches query error:', matchError);
            } else {
                console.log(`✅ Sample matches found: ${sampleMatches?.length || 0} for Mumbai Indians`);
                if (sampleMatches?.length > 0) {
                    console.log('Sample match:', sampleMatches[0]);
                }
            }
        } else {
            console.log('❌ Mumbai Indians not found in teams table');
        }

    } catch (error) {
        console.error('❌ Connection error:', error);
    }
}

checkDatabaseData(); 