-- 🏏 IPL Fantasy Cricket Database Schema
-- Database: ipl_fantasy_db
-- Created for: Dream11 Team Analyzer with Statistical Analysis

-- Create database (run this separately if needed)
-- CREATE DATABASE ipl_fantasy_db;

-- Use this database
-- \c ipl_fantasy_db;

-- ==============================================
-- TEAMS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    short_name VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- VENUES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS venues (
    venue_id SERIAL PRIMARY KEY,
    venue_name VARCHAR(200) NOT NULL UNIQUE,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- PLAYERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS players (
    player_id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    role VARCHAR(50), -- batsman, bowler, all-rounder, wicket-keeper
    team_id INTEGER REFERENCES teams(team_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- MATCHES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS matches (
    match_id INTEGER PRIMARY KEY,
    team1_id INTEGER REFERENCES teams(team_id),
    team2_id INTEGER REFERENCES teams(team_id),
    venue_id INTEGER REFERENCES venues(venue_id),
    match_date DATE NOT NULL,
    season INTEGER,
    match_type VARCHAR(50) DEFAULT 'IPL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- BALL BY BALL DATA TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS ball_by_ball (
    ball_id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(match_id),
    innings INTEGER NOT NULL,
    team_id INTEGER REFERENCES teams(team_id),
    over_number INTEGER NOT NULL,
    ball_number INTEGER NOT NULL,
    batsman_id INTEGER REFERENCES players(player_id),
    non_striker_id INTEGER REFERENCES players(player_id),
    bowler_id INTEGER REFERENCES players(player_id),
    batsman_runs INTEGER DEFAULT 0,
    extras INTEGER DEFAULT 0,
    total_runs INTEGER DEFAULT 0,
    wides INTEGER DEFAULT 0,
    noballs INTEGER DEFAULT 0,
    byes INTEGER DEFAULT 0,
    legbyes INTEGER DEFAULT 0,
    is_wicket BOOLEAN DEFAULT FALSE,
    player_out_id INTEGER REFERENCES players(player_id),
    dismissal_kind VARCHAR(50),
    fielders VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- PLAYER MATCH STATISTICS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS player_match_stats (
    stat_id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(match_id),
    player_id INTEGER REFERENCES players(player_id),
    team_id INTEGER REFERENCES teams(team_id),
    
    -- Batting Stats
    runs_scored INTEGER DEFAULT 0,
    balls_faced INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    strike_rate DECIMAL(5,2) DEFAULT 0,
    is_not_out BOOLEAN DEFAULT FALSE,
    
    -- Bowling Stats
    overs_bowled DECIMAL(3,1) DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    wickets_taken INTEGER DEFAULT 0,
    economy_rate DECIMAL(4,2) DEFAULT 0,
    
    -- Fielding Stats
    catches INTEGER DEFAULT 0,
    stumpings INTEGER DEFAULT 0,
    run_outs INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate entries
    UNIQUE(match_id, player_id)
);

-- ==============================================
-- VENUE STATISTICS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS venue_stats (
    venue_stat_id SERIAL PRIMARY KEY,
    venue_id INTEGER REFERENCES venues(venue_id),
    season INTEGER,
    total_matches INTEGER DEFAULT 0,
    avg_first_innings_score DECIMAL(5,2) DEFAULT 0,
    avg_second_innings_score DECIMAL(5,2) DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    lowest_score INTEGER DEFAULT 0,
    chasing_win_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Ball by ball indexes
CREATE INDEX IF NOT EXISTS idx_ball_by_ball_match_id ON ball_by_ball(match_id);
CREATE INDEX IF NOT EXISTS idx_ball_by_ball_batsman_id ON ball_by_ball(batsman_id);
CREATE INDEX IF NOT EXISTS idx_ball_by_ball_bowler_id ON ball_by_ball(bowler_id);
CREATE INDEX IF NOT EXISTS idx_ball_by_ball_team_id ON ball_by_ball(team_id);

-- Player match stats indexes
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_team_id ON player_match_stats(team_id);

-- Match indexes
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_venue_id ON matches(venue_id);
CREATE INDEX IF NOT EXISTS idx_matches_team1_id ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2_id ON matches(team2_id);

-- Player indexes
CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- ==============================================
-- INITIAL DATA INSERTS
-- ==============================================

-- Insert IPL 2025 teams
INSERT INTO teams (team_name, short_name) VALUES 
('Chennai Super Kings', 'CSK'),
('Mumbai Indians', 'MI'),
('Royal Challengers Bangalore', 'RCB'),
('Kolkata Knight Riders', 'KKR'),
('Delhi Capitals', 'DC'),
('Punjab Kings', 'PBKS'),
('Rajasthan Royals', 'RR'),
('Sunrisers Hyderabad', 'SRH'),
('Gujarat Titans', 'GT'),
('Lucknow Super Giants', 'LSG')
ON CONFLICT (team_name) DO NOTHING;

-- ==============================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================

-- Player recent form view (last 30 days)
CREATE OR REPLACE VIEW player_recent_form AS
SELECT 
    p.player_id,
    p.player_name,
    p.role,
    t.team_name,
    COUNT(pms.match_id) as recent_matches,
    AVG(pms.runs_scored) as avg_runs,
    AVG(pms.strike_rate) as avg_strike_rate,
    AVG(pms.wickets_taken) as avg_wickets,
    AVG(pms.economy_rate) as avg_economy,
    MAX(m.match_date) as last_match_date
FROM players p
JOIN player_match_stats pms ON p.player_id = pms.player_id
JOIN teams t ON p.team_id = t.team_id
JOIN matches m ON pms.match_id = m.match_id
WHERE m.match_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.player_id, p.player_name, p.role, t.team_name;

-- Team head to head view
CREATE OR REPLACE VIEW team_head_to_head AS
SELECT 
    t1.team_name as team1,
    t2.team_name as team2,
    COUNT(*) as total_matches,
    v.venue_name,
    AVG(CASE WHEN m.team1_id = t1.team_id THEN pms1.runs_scored END) as team1_avg_score,
    AVG(CASE WHEN m.team2_id = t2.team_id THEN pms2.runs_scored END) as team2_avg_score
FROM matches m
JOIN teams t1 ON m.team1_id = t1.team_id
JOIN teams t2 ON m.team2_id = t2.team_id
JOIN venues v ON m.venue_id = v.venue_id
LEFT JOIN player_match_stats pms1 ON m.match_id = pms1.match_id AND pms1.team_id = t1.team_id
LEFT JOIN player_match_stats pms2 ON m.match_id = pms2.match_id AND pms2.team_id = t2.team_id
GROUP BY t1.team_name, t2.team_name, v.venue_name;

-- ==============================================
-- FUNCTIONS FOR COMMON CALCULATIONS
-- ==============================================

-- Function to calculate player's recent batting form before a specific date
CREATE OR REPLACE FUNCTION get_player_batting_form(
    p_player_id INTEGER, 
    p_matches INTEGER DEFAULT 5,
    p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    match_date DATE,
    runs INTEGER,
    balls_faced INTEGER,
    strike_rate DECIMAL(5,2),
    venue_name VARCHAR(200),
    days_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.match_date,
        pms.runs_scored,
        pms.balls_faced,
        pms.strike_rate,
        v.venue_name,
        (p_reference_date - m.match_date) as days_ago
    FROM player_match_stats pms
    JOIN matches m ON pms.match_id = m.match_id
    JOIN venues v ON m.venue_id = v.venue_id
    WHERE pms.player_id = p_player_id
    AND m.match_date < p_reference_date  -- Only matches before the reference date
    AND pms.runs_scored > 0  -- Only matches where player actually batted
    ORDER BY m.match_date DESC
    LIMIT p_matches;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate player's recent bowling form before a specific date
CREATE OR REPLACE FUNCTION get_player_bowling_form(
    p_player_id INTEGER, 
    p_matches INTEGER DEFAULT 5,
    p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    match_date DATE,
    overs_bowled DECIMAL(3,1),
    runs_conceded INTEGER,
    wickets INTEGER,
    economy_rate DECIMAL(4,2),
    venue_name VARCHAR(200),
    days_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.match_date,
        pms.overs_bowled,
        pms.runs_conceded,
        pms.wickets_taken,
        pms.economy_rate,
        v.venue_name,
        (p_reference_date - m.match_date) as days_ago
    FROM player_match_stats pms
    JOIN matches m ON pms.match_id = m.match_id
    JOIN venues v ON m.venue_id = v.venue_id
    WHERE pms.player_id = p_player_id
    AND m.match_date < p_reference_date  -- Only matches before the reference date
    AND pms.overs_bowled > 0  -- Only matches where player actually bowled
    ORDER BY m.match_date DESC
    LIMIT p_matches;
END;
$$ LANGUAGE plpgsql;

-- Function to get player form summary before a specific date
CREATE OR REPLACE FUNCTION get_player_form_summary(
    p_player_id INTEGER,
    p_reference_date DATE DEFAULT CURRENT_DATE,
    p_last_matches INTEGER DEFAULT 5
)
RETURNS TABLE(
    player_name VARCHAR(100),
    role VARCHAR(50),
    team_name VARCHAR(100),
    matches_played INTEGER,
    avg_runs DECIMAL(5,2),
    avg_strike_rate DECIMAL(5,2),
    avg_wickets DECIMAL(5,2),
    avg_economy DECIMAL(5,2),
    last_match_date DATE,
    days_since_last_match INTEGER,
    form_rating VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.player_name,
        p.role,
        t.team_name,
        COUNT(pms.match_id)::INTEGER as matches_played,
        AVG(pms.runs_scored) as avg_runs,
        AVG(pms.strike_rate) as avg_strike_rate,
        AVG(pms.wickets_taken) as avg_wickets,
        AVG(pms.economy_rate) as avg_economy,
        MAX(m.match_date) as last_match_date,
        (p_reference_date - MAX(m.match_date))::INTEGER as days_since_last_match,
        CASE 
            WHEN AVG(pms.runs_scored) > 30 OR AVG(pms.wickets_taken) > 1 THEN 'Excellent'
            WHEN AVG(pms.runs_scored) > 20 OR AVG(pms.wickets_taken) > 0.5 THEN 'Good'
            WHEN AVG(pms.runs_scored) > 10 OR AVG(pms.wickets_taken) > 0.2 THEN 'Average'
            ELSE 'Poor'
        END as form_rating
    FROM players p
    JOIN player_match_stats pms ON p.player_id = pms.player_id
    JOIN teams t ON p.team_id = t.team_id
    JOIN matches m ON pms.match_id = m.match_id
    WHERE p.player_id = p_player_id
    AND m.match_date < p_reference_date
    AND m.match_date >= (
        SELECT m2.match_date 
        FROM matches m2 
        JOIN player_match_stats pms2 ON m2.match_id = pms2.match_id 
        WHERE pms2.player_id = p_player_id 
        AND m2.match_date < p_reference_date
        ORDER BY m2.match_date DESC 
        LIMIT 1 OFFSET (p_last_matches - 1)
    )
    GROUP BY p.player_id, p.player_name, p.role, t.team_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get team vs team performance at a venue before a specific date
CREATE OR REPLACE FUNCTION get_team_vs_team_stats(
    p_team1_name VARCHAR(100),
    p_team2_name VARCHAR(100),
    p_venue_name VARCHAR(200),
    p_reference_date DATE DEFAULT CURRENT_DATE,
    p_last_matches INTEGER DEFAULT 5
)
RETURNS TABLE(
    match_date DATE,
    venue_name VARCHAR(200),
    team1_score INTEGER,
    team2_score INTEGER,
    winning_team VARCHAR(100),
    match_result VARCHAR(100),
    days_ago INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.match_date,
        v.venue_name,
        COALESCE(SUM(CASE WHEN pms.team_id = t1.team_id THEN pms.runs_scored END), 0)::INTEGER as team1_score,
        COALESCE(SUM(CASE WHEN pms.team_id = t2.team_id THEN pms.runs_scored END), 0)::INTEGER as team2_score,
        CASE 
            WHEN SUM(CASE WHEN pms.team_id = t1.team_id THEN pms.runs_scored END) > 
                 SUM(CASE WHEN pms.team_id = t2.team_id THEN pms.runs_scored END) 
            THEN t1.team_name
            ELSE t2.team_name
        END as winning_team,
        CASE 
            WHEN SUM(CASE WHEN pms.team_id = t1.team_id THEN pms.runs_scored END) > 
                 SUM(CASE WHEN pms.team_id = t2.team_id THEN pms.runs_scored END) 
            THEN t1.team_name || ' won by ' || 
                 (SUM(CASE WHEN pms.team_id = t1.team_id THEN pms.runs_scored END) - 
                  SUM(CASE WHEN pms.team_id = t2.team_id THEN pms.runs_scored END))::TEXT || ' runs'
            ELSE t2.team_name || ' won by ' || 
                 (SUM(CASE WHEN pms.team_id = t2.team_id THEN pms.runs_scored END) - 
                  SUM(CASE WHEN pms.team_id = t1.team_id THEN pms.runs_scored END))::TEXT || ' runs'
        END as match_result,
        (p_reference_date - m.match_date)::INTEGER as days_ago
    FROM matches m
    JOIN teams t1 ON (m.team1_id = t1.team_id OR m.team2_id = t1.team_id)
    JOIN teams t2 ON (m.team1_id = t2.team_id OR m.team2_id = t2.team_id)
    JOIN venues v ON m.venue_id = v.venue_id
    LEFT JOIN player_match_stats pms ON m.match_id = pms.match_id
    WHERE t1.team_name = p_team1_name
    AND t2.team_name = p_team2_name
    AND t1.team_id != t2.team_id
    AND v.venue_name = p_venue_name
    AND m.match_date < p_reference_date
    GROUP BY m.match_id, m.match_date, v.venue_name, t1.team_name, t2.team_name
    ORDER BY m.match_date DESC
    LIMIT p_last_matches;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGERS FOR DATA INTEGRITY
-- ==============================================

-- Update player match stats when ball by ball data is inserted
CREATE OR REPLACE FUNCTION update_player_match_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update batting stats for the batsman
    INSERT INTO player_match_stats (match_id, player_id, team_id, runs_scored, balls_faced)
    VALUES (NEW.match_id, NEW.batsman_id, NEW.team_id, NEW.batsman_runs, 1)
    ON CONFLICT (match_id, player_id) DO UPDATE SET
        runs_scored = player_match_stats.runs_scored + NEW.batsman_runs,
        balls_faced = player_match_stats.balls_faced + 1,
        strike_rate = CASE 
            WHEN player_match_stats.balls_faced + 1 > 0 
            THEN (player_match_stats.runs_scored + NEW.batsman_runs) * 100.0 / (player_match_stats.balls_faced + 1)
            ELSE 0 
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_player_match_stats
    AFTER INSERT ON ball_by_ball
    FOR EACH ROW
    EXECUTE FUNCTION update_player_match_stats();

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE teams IS 'IPL team information';
COMMENT ON TABLE venues IS 'Cricket venue/stadium information';
COMMENT ON TABLE players IS 'Player information with roles and team associations';
COMMENT ON TABLE matches IS 'Match information including teams, venue, and date';
COMMENT ON TABLE ball_by_ball IS 'Detailed ball-by-ball data from IPL matches';
COMMENT ON TABLE player_match_stats IS 'Aggregated player statistics per match';
COMMENT ON TABLE venue_stats IS 'Statistical analysis of venue performance';

-- ==============================================
-- PERFORMANCE MONITORING
-- ==============================================

-- Create a table to track query performance
CREATE TABLE IF NOT EXISTS query_performance (
    query_id SERIAL PRIMARY KEY,
    query_name VARCHAR(100),
    execution_time INTERVAL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'IPL Fantasy Cricket Database Schema Created Successfully!';
    RAISE NOTICE 'Tables created: teams, venues, players, matches, ball_by_ball, player_match_stats, venue_stats';
    RAISE NOTICE 'Next step: Run the data loading script to populate tables from CSV';
END $$; 