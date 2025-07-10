const supabase = require('../services/supabaseClient');

exports.getTeams = async (req, res) => {
    try {
        // Hardcoded IPL teams
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
        res.json({
            success: true,
            teams: iplTeams,
            message: 'IPL 2025 teams list'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get teams', error: error.message });
    }
};

exports.getTeamsSupabase = async (req, res) => {
    try {
        const { data: teams, error } = await supabase
            .from('teams')
            .select('team_id, team_name, short_name')
            .order('team_name', { ascending: true });
        if (error) throw error;
        res.json({
            success: true,
            message: 'Supabase is working!',
            teams: teams,
            count: teams.length,
            supabaseWorking: true
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Supabase connection failed',
            error: error.message,
            supabaseWorking: false
        });
    }
}; 