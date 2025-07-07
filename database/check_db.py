#!/usr/bin/env python3

import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import urllib.parse

# Load environment variables
load_dotenv()

# Database connection
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT')
db_name = os.getenv('DB_NAME')

# URL encode the password to handle special characters
encoded_password = urllib.parse.quote_plus(db_password)

# Create connection string
connection_string = f"postgresql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"

try:
    # Create engine
    engine = create_engine(connection_string)
    
    # Check each table
    tables = ['teams', 'venues', 'players', 'matches', 'ball_by_ball']
    
    for table in tables:
        try:
            query = f"SELECT COUNT(*) as count FROM {table}"
            result = pd.read_sql(query, engine)
            print(f"{table}: {result['count'].iloc[0]} records")
            
            if table == 'teams':
                # Show team names
                teams_df = pd.read_sql("SELECT team_name, short_name FROM teams ORDER BY team_name", engine)
                print("Teams in database:")
                for _, row in teams_df.iterrows():
                    print(f"  - {row['team_name']} ({row['short_name']})")
                print()
                
        except Exception as e:
            print(f"{table}: Error - {e}")
    
    engine.dispose()
    
except Exception as e:
    print(f"Database connection error: {e}") 