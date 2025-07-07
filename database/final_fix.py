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

class IPLDatabaseFinalFix:
    """Final comprehensive fix for IPL database - handles incomplete matches correctly"""
    
    def __init__(self):
        self.engine = None
        self.csv_file = "../data/ipl_ball_by_ball.csv"
        self.batch_size = 1000
        self.connect_database()
        
    def connect_database(self):
        """Connect to database"""
        try:
            load_dotenv()
            
            db_user = os.getenv('DB_USER')
            db_password = os.getenv('DB_PASSWORD')
            db_host = os.getenv('DB_HOST')
            db_port = os.getenv('DB_PORT')
            db_name = os.getenv('DB_NAME')
            
            if db_password:
                encoded_password = urllib.parse.quote_plus(db_password)
                connection_string = f'postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}'
                self.engine = create_engine(connection_string)
                
                # Test connection
                with self.engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                
                logger.info("Database connection successful")
            else:
                raise ValueError("Database password not found")
                
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def complete_ball_by_ball_data_final(self):
        """Complete ball-by-ball data loading, skipping incomplete matches"""
        logger.info("⚾ Final ball-by-ball data loading (skipping incomplete matches)...")
        
        try:
            # Load CSV data
            df = pd.read_csv(self.csv_file)
            df['date'] = pd.to_datetime(df['date'])
            
            # Identify incomplete matches (matches with only 1 team)
            match_team_counts = df.groupby('match_id')['team'].nunique().reset_index()
            incomplete_matches = match_team_counts[match_team_counts['team'] < 2]['match_id'].tolist()
            
            logger.info(f"Found {len(incomplete_matches)} incomplete matches to skip: {incomplete_matches}")
            
            # Filter out incomplete matches
            df_complete = df[~df['match_id'].isin(incomplete_matches)]
            logger.info(f"Filtered dataset: {len(df_complete)} records (excluding {len(df) - len(df_complete)} incomplete records)")
            
            # Get existing matches from database
            existing_matches = pd.read_sql("SELECT match_id FROM matches", self.engine)
            existing_match_ids = set(existing_matches['match_id'].tolist())
            
            # Get CSV matches that are complete
            csv_complete_matches = set(df_complete['match_id'].unique())
            
            # Only load ball-by-ball data for matches that exist in the database
            valid_matches = csv_complete_matches.intersection(existing_match_ids)
            logger.info(f"Valid matches for ball-by-ball loading: {len(valid_matches)}")
            
            # Filter data for valid matches only
            df_valid = df_complete[df_complete['match_id'].isin(valid_matches)]
            logger.info(f"Valid ball-by-ball records to process: {len(df_valid)}")
            
            # Get existing ball-by-ball data count
            current_count = pd.read_sql("SELECT COUNT(*) as count FROM ball_by_ball", self.engine)['count'].iloc[0]
            logger.info(f"Current ball_by_ball records: {current_count}")
            
            if len(df_valid) > current_count:
                # Get mappings
                teams_map = self.get_teams_mapping()
                players_map = self.get_players_mapping()
                
                # Get existing ball records to avoid duplicates
                existing_balls = pd.read_sql("""
                    SELECT DISTINCT match_id, innings, over_number, ball_number, batsman_id, bowler_id
                    FROM ball_by_ball
                """, self.engine)
                
                # Create composite key for existing records
                existing_keys = set()
                for _, row in existing_balls.iterrows():
                    key = f"{row['match_id']}-{row['innings']}-{row['over_number']}-{row['ball_number']}-{row['batsman_id']}-{row['bowler_id']}"
                    existing_keys.add(key)
                
                # Prepare CSV data
                csv_data = df_valid.copy()
                csv_data['team_id'] = csv_data['team'].map(teams_map)
                csv_data['batsman_id'] = csv_data['batsman'].map(players_map)
                csv_data['non_striker_id'] = csv_data['non_striker'].map(players_map)
                csv_data['bowler_id'] = csv_data['bowler'].map(players_map)
                csv_data['player_out_id'] = csv_data['player_out'].map(players_map)
                
                # Rename columns
                csv_data = csv_data.rename(columns={
                    'over': 'over_number',
                    'ball': 'ball_number',
                    'kind': 'dismissal_kind'
                })
                
                csv_data['is_wicket'] = csv_data['wicket'].notna()
                
                # Create composite key for CSV records
                csv_data['composite_key'] = (
                    csv_data['match_id'].astype(str) + '-' + 
                    csv_data['innings'].astype(str) + '-' + 
                    csv_data['over_number'].astype(str) + '-' + 
                    csv_data['ball_number'].astype(str) + '-' + 
                    csv_data['batsman_id'].astype(str) + '-' + 
                    csv_data['bowler_id'].astype(str)
                )
                
                # Filter out existing records
                new_records = csv_data[~csv_data['composite_key'].isin(existing_keys)]
                
                if len(new_records) > 0:
                    # Select required columns
                    columns_to_insert = [
                        'match_id', 'innings', 'team_id', 'over_number', 'ball_number',
                        'batsman_id', 'non_striker_id', 'bowler_id', 'batsman_runs',
                        'extras', 'total_runs', 'wides', 'noballs', 'byes', 'legbyes',
                        'is_wicket', 'player_out_id', 'dismissal_kind', 'fielders'
                    ]
                    
                    final_data = new_records[columns_to_insert].copy()
                    
                    # Remove rows with missing essential data
                    final_data = final_data.dropna(subset=['match_id', 'team_id', 'batsman_id', 'bowler_id'])
                    
                    logger.info(f"Loading {len(final_data)} new ball-by-ball records...")
                    
                    # Load in batches
                    for i in range(0, len(final_data), self.batch_size):
                        batch = final_data.iloc[i:i+self.batch_size]
                        batch.to_sql('ball_by_ball', self.engine, if_exists='append', index=False)
                        
                        if (i // self.batch_size + 1) % 10 == 0:
                            logger.info(f"Loaded {i + len(batch)}/{len(final_data)} records ({((i + len(batch))/len(final_data))*100:.1f}%)")
                    
                    logger.info(f"✅ Successfully loaded {len(final_data)} new ball-by-ball records")
                else:
                    logger.info("✅ All valid ball-by-ball records already loaded")
            else:
                logger.info("✅ Ball-by-ball data already complete")
                
        except Exception as e:
            logger.error(f"❌ Error completing ball-by-ball data: {e}")
            raise
    
    def add_match_winner_column(self):
        """Add winner column and calculate winners"""
        logger.info("🏆 Adding match winner information...")
        
        try:
            # Add winner columns if they don't exist
            with self.engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE matches 
                    ADD COLUMN IF NOT EXISTS winner_team_id INTEGER REFERENCES teams(team_id),
                    ADD COLUMN IF NOT EXISTS winning_margin INTEGER,
                    ADD COLUMN IF NOT EXISTS win_type VARCHAR(20)
                """))
                conn.commit()
            
            # Calculate match winners
            winner_query = """
            WITH innings_totals AS (
                SELECT 
                    bb.match_id,
                    bb.innings,
                    bb.team_id,
                    SUM(bb.total_runs) as total_runs
                FROM ball_by_ball bb
                GROUP BY bb.match_id, bb.innings, bb.team_id
            ),
            match_scores AS (
                SELECT 
                    m.match_id,
                    m.team1_id,
                    m.team2_id,
                    COALESCE(MAX(CASE WHEN it.team_id = m.team1_id THEN it.total_runs END), 0) as team1_score,
                    COALESCE(MAX(CASE WHEN it.team_id = m.team2_id THEN it.total_runs END), 0) as team2_score
                FROM matches m
                LEFT JOIN innings_totals it ON m.match_id = it.match_id
                GROUP BY m.match_id, m.team1_id, m.team2_id
            )
            UPDATE matches 
            SET 
                winner_team_id = CASE 
                    WHEN ms.team1_score > ms.team2_score THEN ms.team1_id
                    WHEN ms.team2_score > ms.team1_score THEN ms.team2_id
                    ELSE NULL
                END,
                winning_margin = CASE 
                    WHEN ms.team1_score > ms.team2_score THEN ms.team1_score - ms.team2_score
                    WHEN ms.team2_score > ms.team1_score THEN ms.team2_score - ms.team1_score
                    ELSE NULL
                END,
                win_type = 'runs'
            FROM match_scores ms
            WHERE matches.match_id = ms.match_id
            AND (ms.team1_score > 0 OR ms.team2_score > 0)
            """
            
            with self.engine.connect() as conn:
                conn.execute(text(winner_query))
                conn.commit()
            
            # Check results
            winner_stats = pd.read_sql("""
                SELECT 
                    COUNT(*) as total_matches,
                    COUNT(winner_team_id) as matches_with_winners
                FROM matches
            """, self.engine)
            
            logger.info(f"✅ Match winners calculated: {winner_stats['matches_with_winners'].iloc[0]}/{winner_stats['total_matches'].iloc[0]} matches")
            
        except Exception as e:
            logger.error(f"❌ Error adding match winners: {e}")
            raise
    
    def fix_player_match_stats(self):
        """Fix player match statistics"""
        logger.info("📊 Fixing player match statistics...")
        
        try:
            # Clear existing stats
            with self.engine.connect() as conn:
                conn.execute(text("DELETE FROM player_match_stats"))
                conn.commit()
            
            logger.info("Calculating batting statistics...")
            
            # Batting statistics
            batting_stats_query = """
            INSERT INTO player_match_stats (
                match_id, player_id, team_id, runs_scored, balls_faced, 
                fours, sixes, strike_rate, is_not_out
            )
            SELECT 
                bb.match_id,
                bb.batsman_id as player_id,
                bb.team_id,
                SUM(bb.batsman_runs) as runs_scored,
                COUNT(*) as balls_faced,
                COUNT(CASE WHEN bb.batsman_runs = 4 THEN 1 END) as fours,
                COUNT(CASE WHEN bb.batsman_runs = 6 THEN 1 END) as sixes,
                CASE 
                    WHEN COUNT(*) > 0 THEN ROUND((SUM(bb.batsman_runs) * 100.0 / COUNT(*))::numeric, 2)
                    ELSE 0 
                END as strike_rate,
                CASE 
                    WHEN COUNT(CASE WHEN bb.is_wicket = true AND bb.player_out_id = bb.batsman_id THEN 1 END) = 0 
                    THEN true 
                    ELSE false 
                END as is_not_out
            FROM ball_by_ball bb
            WHERE bb.batsman_id IS NOT NULL
            GROUP BY bb.match_id, bb.batsman_id, bb.team_id
            """
            
            with self.engine.connect() as conn:
                conn.execute(text(batting_stats_query))
                conn.commit()
            
            logger.info("Updating bowling statistics...")
            
            # Bowling statistics
            bowling_stats_query = """
            UPDATE player_match_stats 
            SET 
                overs_bowled = bowling_stats.overs_bowled,
                runs_conceded = bowling_stats.runs_conceded,
                wickets_taken = bowling_stats.wickets_taken,
                economy_rate = bowling_stats.economy_rate
            FROM (
                SELECT 
                    bb.match_id,
                    bb.bowler_id as player_id,
                    ROUND((COUNT(*) / 6.0)::numeric, 1) as overs_bowled,
                    SUM(bb.total_runs) as runs_conceded,
                    COUNT(CASE WHEN bb.is_wicket = true AND bb.player_out_id IS NOT NULL THEN 1 END) as wickets_taken,
                    CASE 
                        WHEN COUNT(*) > 0 THEN ROUND((SUM(bb.total_runs) * 6.0 / COUNT(*))::numeric, 2)
                        ELSE 0 
                    END as economy_rate
                FROM ball_by_ball bb
                WHERE bb.bowler_id IS NOT NULL
                GROUP BY bb.match_id, bb.bowler_id
            ) bowling_stats
            WHERE player_match_stats.match_id = bowling_stats.match_id
            AND player_match_stats.player_id = bowling_stats.player_id
            """
            
            with self.engine.connect() as conn:
                conn.execute(text(bowling_stats_query))
                conn.commit()
            
            logger.info("Inserting bowling-only records...")
            
            # Bowling-only records
            bowling_only_query = """
            INSERT INTO player_match_stats (
                match_id, player_id, team_id, runs_scored, balls_faced, 
                fours, sixes, strike_rate, is_not_out,
                overs_bowled, runs_conceded, wickets_taken, economy_rate
            )
            SELECT 
                bb.match_id,
                bb.bowler_id as player_id,
                bb.team_id,
                0 as runs_scored,
                0 as balls_faced,
                0 as fours,
                0 as sixes,
                0 as strike_rate,
                false as is_not_out,
                ROUND((COUNT(*) / 6.0)::numeric, 1) as overs_bowled,
                SUM(bb.total_runs) as runs_conceded,
                COUNT(CASE WHEN bb.is_wicket = true AND bb.player_out_id IS NOT NULL THEN 1 END) as wickets_taken,
                CASE 
                    WHEN COUNT(*) > 0 THEN ROUND((SUM(bb.total_runs) * 6.0 / COUNT(*))::numeric, 2)
                    ELSE 0 
                END as economy_rate
            FROM ball_by_ball bb
            WHERE bb.bowler_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM player_match_stats pms 
                WHERE pms.match_id = bb.match_id AND pms.player_id = bb.bowler_id
            )
            GROUP BY bb.match_id, bb.bowler_id, bb.team_id
            """
            
            with self.engine.connect() as conn:
                conn.execute(text(bowling_only_query))
                conn.commit()
            
            # Check results
            stats_check = pd.read_sql("""
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN overs_bowled > 0 THEN 1 END) as bowling_records,
                    COUNT(CASE WHEN runs_scored > 0 THEN 1 END) as batting_records
                FROM player_match_stats
            """, self.engine)
            
            logger.info(f"✅ Player match statistics fixed:")
            logger.info(f"   Total records: {stats_check['total_records'].iloc[0]}")
            logger.info(f"   Bowling records: {stats_check['bowling_records'].iloc[0]}")
            logger.info(f"   Batting records: {stats_check['batting_records'].iloc[0]}")
            
        except Exception as e:
            logger.error(f"❌ Error fixing player match stats: {e}")
            raise
    
    def get_teams_mapping(self):
        """Get team name to ID mapping"""
        teams_df = pd.read_sql("SELECT team_id, team_name FROM teams", self.engine)
        return dict(zip(teams_df['team_name'], teams_df['team_id']))
    
    def get_players_mapping(self):
        """Get player name to ID mapping"""
        players_df = pd.read_sql("SELECT player_id, player_name FROM players", self.engine)
        return dict(zip(players_df['player_name'], players_df['player_id']))
    
    def run_final_fix(self):
        """Run final comprehensive fix"""
        logger.info("🚀 Starting FINAL comprehensive database fix...")
        
        try:
            # Complete ball-by-ball data (skipping incomplete matches)
            self.complete_ball_by_ball_data_final()
            
            # Add match winners
            self.add_match_winner_column()
            
            # Fix player match statistics
            self.fix_player_match_stats()
            
            logger.info("🎉 FINAL comprehensive database fix completed successfully!")
            
        except Exception as e:
            logger.error(f"💥 Final database fix failed: {e}")
            raise
        finally:
            if self.engine:
                self.engine.dispose()

def main():
    """Main function"""
    try:
        fixer = IPLDatabaseFinalFix()
        fixer.run_final_fix()
        return 0
    except Exception as e:
        logger.error(f"Application failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 