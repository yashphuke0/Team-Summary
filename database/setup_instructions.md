# 🏏 Database Setup Instructions

## Prerequisites

### 1. Install PostgreSQL
```powershell
# Using Chocolatey (Run as Administrator)
choco install postgresql --yes

# Or download from: https://www.postgresql.org/download/windows/
```

### 2. Install Python Dependencies
```powershell
# Navigate to database folder
cd database

# Install required packages
pip install -r requirements.txt
```

## Database Setup

### 1. Create Database
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ipl_fantasy_db;

# Exit PostgreSQL
\q
```

### 2. Create Environment File
Create a `.env` file in the database folder with:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ipl_fantasy_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# Optional settings
BATCH_SIZE=1000
LOG_LEVEL=INFO
```

### 3. Execute Schema Script
```powershell
# Run schema creation
psql -U postgres -d ipl_fantasy_db -f schema.sql
```

### 4. Load Data
```powershell
# Run data loader
python data_loader.py
```

## Verification

### Check Tables
```sql
-- Connect to database
psql -U postgres -d ipl_fantasy_db

-- List tables
\dt

-- Check data
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM matches;
SELECT COUNT(*) FROM ball_by_ball;
```

## Troubleshooting

### Common Issues

1. **Connection Error**: Check PostgreSQL service is running
2. **Authentication Error**: Verify username/password in .env file
3. **Permission Error**: Ensure database user has proper permissions
4. **Data Loading Error**: Check CSV file path and format

### Services
```powershell
# Check PostgreSQL service
Get-Service -Name "*postgresql*"

# Start service if needed
Start-Service postgresql-x64-*
```

## Usage Examples

### Query Player Form Before Match Date
```sql
-- Get Virat Kohli's last 5 batting performances before 2024-04-15
SELECT * FROM get_player_batting_form(123, 5, '2024-04-15');

-- Get Jasprit Bumrah's bowling form before match date
SELECT * FROM get_player_bowling_form(456, 5, '2024-04-15');

-- Get comprehensive player form summary
SELECT * FROM get_player_form_summary(123, '2024-04-15', 5);
```

### Query Team vs Team Stats
```sql
-- Get CSK vs MI head-to-head at Wankhede before specific date
SELECT * FROM get_team_vs_team_stats(
    'Chennai Super Kings', 
    'Mumbai Indians', 
    'Wankhede Stadium', 
    '2024-04-15', 
    5
);
```

## Next Steps

After successful setup:
1. Test database connection from Node.js
2. Create API endpoints that use the date-based functions
3. Integrate with existing frontend (pass match date from user)
4. Add caching and optimization 