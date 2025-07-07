#!/usr/bin/env python3

import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import urllib.parse

def connect_database():
    """Establish database connection"""
    load_dotenv()
    
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_host = os.getenv('DB_HOST')
    db_port = os.getenv('DB_PORT')
    db_name = os.getenv('DB_NAME')
    
    encoded_password = urllib.parse.quote_plus(db_password)
    connection_string = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"
    
    return create_engine(connection_string)

def verify_data():
    """Verify data quality and run sample queries"""
    engine = connect_database()
    
    print("🏏 IPL Fantasy Database Verification")
    print("=" * 50)
    
    # Basic counts
    print("\n📊 Database Summary:")
    tables = ['teams', 'venues', 'players', 'matches', 'ball_by_ball']
    for table in tables:
        count = pd.read_sql(f"SELECT COUNT(*) as count FROM {table}", engine)['count'].iloc[0]
        print(f"   {table.capitalize()}: {count:,} records")
    
    # Date range
    print("\n📅 Data Coverage:")
    date_range = pd.read_sql("""
        SELECT 
            MIN(match_date) as first_match,
            MAX(match_date) as last_match,
            COUNT(DISTINCT season) as seasons
        FROM matches
    """, engine)
    
    print(f"   First Match: {date_range['first_match'].iloc[0]}")
    print(f"   Last Match: {date_range['last_match'].iloc[0]}")
    print(f"   Seasons: {date_range['seasons'].iloc[0]}")
    
    # Sample team statistics
    print("\n🏆 Team Performance (Top 5 by matches played):")
    team_stats = pd.read_sql("""
        SELECT 
            t.team_name,
            COUNT(*) as matches_played
        FROM matches m
        JOIN teams t ON (m.team1_id = t.team_id OR m.team2_id = t.team_id)
        GROUP BY t.team_id, t.team_name
        ORDER BY matches_played DESC
        LIMIT 5
    """, engine)
    
    for _, row in team_stats.iterrows():
        print(f"   {row['team_name']}: {row['matches_played']} matches")
    
    # Sample player statistics
    print("\n🏏 Top Run Scorers (All Time):")
    batsman_stats = pd.read_sql("""
        SELECT 
            p.player_name,
            SUM(bb.batsman_runs) as total_runs,
            COUNT(*) as balls_faced
        FROM ball_by_ball bb
        JOIN players p ON bb.batsman_id = p.player_id
        GROUP BY p.player_id, p.player_name
        HAVING SUM(bb.batsman_runs) > 100
        ORDER BY total_runs DESC
        LIMIT 5
    """, engine)
    
    for _, row in batsman_stats.iterrows():
        print(f"   {row['player_name']}: {row['total_runs']} runs ({row['balls_faced']} balls)")
    
    # Sample venue statistics
    print("\n🏟️ Most Used Venues:")
    venue_stats = pd.read_sql("""
        SELECT 
            v.venue_name,
            COUNT(*) as matches_hosted
        FROM matches m
        JOIN venues v ON m.venue_id = v.venue_id
        GROUP BY v.venue_id, v.venue_name
        ORDER BY matches_hosted DESC
        LIMIT 5
    """, engine)
    
    for _, row in venue_stats.iterrows():
        print(f"   {row['venue_name']}: {row['matches_hosted']} matches")
    
    # Test the player form function
    print("\n📈 Testing Player Form Function:")
    try:
        form_test = pd.read_sql("""
            SELECT * FROM get_player_recent_form('V Kohli', '2020-01-01', 5)
        """, engine)
        
        if not form_test.empty:
            avg_runs = form_test['runs_scored'].mean()
            print(f"   V Kohli recent form: {avg_runs:.1f} runs per match (last 5 matches)")
        else:
            print("   Player form function working (no recent matches found)")
    except Exception as e:
        print(f"   Player form function test failed: {e}")
    
    # Test team head-to-head function
    print("\n⚔️ Testing Team Head-to-Head Function:")
    try:
        h2h_test = pd.read_sql("""
            SELECT * FROM get_team_head_to_head('Mumbai Indians', 'Chennai Super Kings')
        """, engine)
        
        if not h2h_test.empty:
            team1_wins = h2h_test['team1_wins'].iloc[0]
            team2_wins = h2h_test['team2_wins'].iloc[0]
            print(f"   Mumbai Indians vs Chennai Super Kings: {team1_wins}-{team2_wins}")
        else:
            print("   Head-to-head function working (no matches found)")
    except Exception as e:
        print(f"   Head-to-head function test failed: {e}")
    
    # Data quality checks
    print("\n🔍 Data Quality Checks:")
    
    # Check for orphaned records
    orphaned_balls = pd.read_sql("""
        SELECT COUNT(*) as count 
        FROM ball_by_ball bb 
        LEFT JOIN matches m ON bb.match_id = m.match_id 
        WHERE m.match_id IS NULL
    """, engine)['count'].iloc[0]
    
    print(f"   Orphaned ball-by-ball records: {orphaned_balls}")
    
    # Check for missing player mappings
    missing_players = pd.read_sql("""
        SELECT COUNT(*) as count 
        FROM ball_by_ball bb 
        WHERE bb.batsman_id IS NULL OR bb.bowler_id IS NULL
    """, engine)['count'].iloc[0]
    
    print(f"   Records with missing player mappings: {missing_players}")
    
    print("\n✅ Database verification completed!")
    print("\nThe IPL Fantasy database is ready for use! 🚀")
    
    engine.dispose()

if __name__ == "__main__":
    verify_data() 