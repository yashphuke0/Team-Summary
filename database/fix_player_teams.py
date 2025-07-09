#!/usr/bin/env python3

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import urllib.parse
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PlayerTeamFixer:
    """Fix missing team assignments for players in the database"""
    
    def __init__(self):
        self.engine = None
        self.csv_file = "../data/ipl_ball_by_ball.csv"
        self.connect_database()
        
    def connect_database(self):
        """Connect to database"""
        try:
            load_dotenv()
            
            db_user = os.getenv('DB_USER', 'postgres')
            db_password = os.getenv('DB_PASSWORD')
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'ipl_fantasy_db')
            
            if not db_password:
                # Try common default passwords for development
                db_password = input("Enter database password: ")
            
            encoded_password = urllib.parse.quote_plus(db_password)
            connection_string = f'postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}'
            self.engine = create_engine(connection_string)
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("✅ Database connection successful")
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise
    
    def get_teams_mapping(self):
        """Get team name to ID mapping from database"""
        teams_df = pd.read_sql("SELECT team_id, team_name FROM teams ORDER BY team_name", self.engine)
        logger.info(f"Found {len(teams_df)} teams in database:")
        for _, team in teams_df.iterrows():
            logger.info(f"  {team['team_id']}: {team['team_name']}")
        
        return dict(zip(teams_df['team_name'], teams_df['team_id']))
    
    def analyze_player_team_assignments(self):
        """Analyze which teams players belong to based on CSV data"""
        logger.info("📊 Analyzing player-team assignments from CSV data...")
        
        try:
            # Load CSV data
            df = pd.read_csv(self.csv_file)
            logger.info(f"Loaded {len(df)} records from CSV")
            
            # Get teams mapping
            teams_map = self.get_teams_mapping()
            
            # Find player team assignments from CSV
            player_teams = {}
            
            # From batsman data
            for _, row in df[['batsman', 'team']].dropna().iterrows():
                player = row['batsman']
                team = row['team']
                if player not in player_teams:
                    player_teams[player] = set()
                player_teams[player].add(team)
            
            # From non-striker data
            for _, row in df[['non_striker', 'team']].dropna().iterrows():
                player = row['non_striker']
                team = row['team']
                if player not in player_teams:
                    player_teams[player] = set()
                player_teams[player].add(team)
            
            # From bowler data (they belong to the opposing team)
            team_pairs = df[['team1', 'team2']].drop_duplicates()
            team_opponents = {}
            for _, row in team_pairs.iterrows():
                if pd.notna(row['team1']) and pd.notna(row['team2']):
                    team_opponents[row['team1']] = row['team2']
                    team_opponents[row['team2']] = row['team1']
            
            for _, row in df[['bowler', 'team']].dropna().iterrows():
                player = row['bowler']
                batting_team = row['team']
                bowling_team = team_opponents.get(batting_team)
                if bowling_team and player not in player_teams:
                    player_teams[player] = set()
                if bowling_team:
                    player_teams[player].add(bowling_team)
            
            logger.info(f"Found team assignments for {len(player_teams)} players")
            
            # Resolve conflicts (players assigned to multiple teams)
            resolved_assignments = {}
            conflicts = 0
            
            for player, teams in player_teams.items():
                if len(teams) == 1:
                    resolved_assignments[player] = list(teams)[0]
                else:
                    # Take the most frequent team assignment
                    team_counts = {}
                    for team in teams:
                        team_counts[team] = len(df[(df['batsman'] == player) & (df['team'] == team)]) + \
                                          len(df[(df['non_striker'] == player) & (df['team'] == team)])
                    
                    if team_counts:
                        most_frequent_team = max(team_counts, key=team_counts.get)
                        resolved_assignments[player] = most_frequent_team
                        conflicts += 1
                        logger.info(f"  Conflict resolved for {player}: {list(teams)} -> {most_frequent_team}")
            
            logger.info(f"Resolved {conflicts} conflicts")
            logger.info(f"Final assignments: {len(resolved_assignments)} players")
            
            return resolved_assignments, teams_map
            
        except Exception as e:
            logger.error(f"❌ Error analyzing player teams: {e}")
            raise
    
    def update_player_teams(self):
        """Update player team assignments in the database"""
        logger.info("🔧 Updating player team assignments in database...")
        
        try:
            # Get player-team assignments from CSV
            player_assignments, teams_map = self.analyze_player_team_assignments()
            
            # Get current players from database
            db_players = pd.read_sql("SELECT player_id, player_name, team_id FROM players", self.engine)
            logger.info(f"Found {len(db_players)} players in database")
            
            # Check current team assignments
            players_with_teams = len(db_players[db_players['team_id'].notna()])
            players_without_teams = len(db_players[db_players['team_id'].isna()])
            
            logger.info(f"Current status: {players_with_teams} players have teams, {players_without_teams} don't")
            
            updates = 0
            not_found = 0
            
            with self.engine.connect() as conn:
                for player_name, team_name in player_assignments.items():
                    if team_name in teams_map:
                        team_id = teams_map[team_name]
                        
                        # Update player team
                        result = conn.execute(text("""
                            UPDATE players 
                            SET team_id = :team_id 
                            WHERE player_name = :player_name AND (team_id IS NULL OR team_id != :team_id)
                        """), {"team_id": team_id, "player_name": player_name})
                        
                        if result.rowcount > 0:
                            updates += 1
                            if updates <= 10:  # Show first 10 updates
                                logger.info(f"  Updated {player_name} -> {team_name} (ID: {team_id})")
                    else:
                        not_found += 1
                        if not_found <= 5:  # Show first 5 not found
                            logger.info(f"  Team not found: {team_name} for player {player_name}")
                
                conn.commit()
            
            logger.info(f"✅ Updated {updates} player team assignments")
            logger.info(f"⚠️ {not_found} team names not found in database")
            
            # Verify results
            updated_players = pd.read_sql("SELECT COUNT(*) as count FROM players WHERE team_id IS NOT NULL", self.engine)
            logger.info(f"🎯 Final result: {updated_players['count'].iloc[0]} players now have team assignments")
            
        except Exception as e:
            logger.error(f"❌ Error updating player teams: {e}")
            raise
    
    def verify_fix(self):
        """Verify the fix worked"""
        logger.info("🔍 Verifying player team assignments...")
        
        try:
            # Check team assignments
            team_stats = pd.read_sql("""
                SELECT 
                    t.team_name,
                    COUNT(p.player_id) as player_count
                FROM teams t
                LEFT JOIN players p ON t.team_id = p.team_id AND p.is_active = true
                GROUP BY t.team_id, t.team_name
                ORDER BY player_count DESC, t.team_name
            """, self.engine)
            
            logger.info("Player distribution by team:")
            for _, row in team_stats.iterrows():
                logger.info(f"  {row['team_name']}: {row['player_count']} players")
            
            # Check for remaining unassigned players
            unassigned = pd.read_sql("""
                SELECT COUNT(*) as count FROM players WHERE team_id IS NULL AND is_active = true
            """, self.engine)
            
            logger.info(f"Unassigned players: {unassigned['count'].iloc[0]}")
            
            if unassigned['count'].iloc[0] == 0:
                logger.info("✅ All active players now have team assignments!")
            else:
                logger.info("⚠️ Some players still don't have team assignments")
            
        except Exception as e:
            logger.error(f"❌ Error verifying fix: {e}")
            raise
    
    def run_fix(self):
        """Run the complete fix"""
        logger.info("🚀 Starting player team assignment fix...")
        
        try:
            self.update_player_teams()
            self.verify_fix()
            logger.info("🎉 Player team assignment fix completed!")
            
        except Exception as e:
            logger.error(f"💥 Fix failed: {e}")
            raise
        finally:
            if self.engine:
                self.engine.dispose()

def main():
    """Main function"""
    try:
        fixer = PlayerTeamFixer()
        fixer.run_fix()
        return 0
    except Exception as e:
        logger.error(f"Application failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 