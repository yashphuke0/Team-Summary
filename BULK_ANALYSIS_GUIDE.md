# 🏏 Bulk Team Analysis Guide

## Overview
The Bulk Team Analyzer now includes all features from the main single-team analyzer, plus enhanced capabilities for analyzing multiple teams at once.

## 🚀 Features

### 1. **Multiple Ingestion Methods**
- **CSV Upload**: Upload a CSV file with multiple teams
- **Multiple Screenshots**: Upload up to 10 Dream11 screenshots at once

### 2. **Individual Team Analysis**
- Select any team from the uploaded teams
- Manual captain and vice-captain selection
- Same AI analysis as the main page
- Detailed team composition analysis

### 3. **Comparative Analysis**
- Compare all teams at once
- Find most popular players across teams
- Analyze team composition trends
- Identify most common captain/vice-captain choices

## 📊 CSV Format

### Required Headers
```csv
TeamName,Players,Captain,ViceCaptain
```

### Example CSV
```csv
TeamName,Players,Captain,ViceCaptain
Team Alpha,"Virat Kohli, Rohit Sharma, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Virat Kohli,Rohit Sharma
Team Beta,"Rohit Sharma, Virat Kohli, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Rohit Sharma,Virat Kohli
```

### CSV Rules
- **Players**: Comma-separated or semicolon-separated list
- **Maximum**: 11 players per team
- **File size**: Up to 1MB
- **Encoding**: UTF-8

## 📱 Multiple Screenshots

### Requirements
- **Format**: JPG, PNG
- **Size**: Up to 5MB per image
- **Limit**: Maximum 10 screenshots
- **Quality**: Clear, readable player names

### Processing
- Each screenshot is processed individually
- OCR extracts player names automatically
- Manual captain/vice-captain selection available

## 🔍 Analysis Features

### Individual Team Analysis
1. **Upload teams** (CSV or screenshots)
2. **Select match details** (Team A, Team B, Date)
3. **Choose a team** from the dropdown
4. **Select captain and vice-captain** manually
5. **Get AI analysis** with detailed insights

### Comparative Analysis
1. **Upload multiple teams**
2. **Select match details**
3. **Click "Analyze All Teams"**
4. **View comparative insights**:
   - Most popular players
   - Team composition trends
   - Captain/vice-captain preferences

## 🎯 AI Analysis Includes

### Team Composition
- Batsmen, bowlers, all-rounders, wicket-keepers count
- Team balance assessment
- Role distribution analysis

### Strategic Insights
- Venue-specific recommendations
- Team form analysis
- Head-to-head statistics
- Player performance trends

### Risk Assessment
- Team dependency analysis
- Captain/vice-captain impact
- Balance vs. specialization trade-offs

## 📋 Step-by-Step Usage

### Method 1: CSV Upload
1. **Prepare CSV file** with team data
2. **Click "CSV Upload" tab**
3. **Upload your CSV file**
4. **Select match details**
5. **Choose team for individual analysis** or **analyze all teams**

### Method 2: Multiple Screenshots
1. **Take screenshots** of Dream11 teams
2. **Click "Multiple Screenshots" tab**
3. **Upload screenshots** (up to 10)
4. **Select match details**
5. **Choose team for individual analysis** or **analyze all teams**

## 🔧 Technical Details

### Backend Endpoints
- `POST /api/csv/process-teams` - Process CSV upload
- `POST /api/ocr/process-multiple` - Process multiple screenshots
- `POST /api/analyze/bulk-teams` - Bulk team analysis
- `POST /api/analyze` - Team Details

### Data Flow
1. **Upload** → Process files/screenshots
2. **Extract** → Parse team data
3. **Select** → Choose team for detailed analysis
4. **Configure** → Set captain/vice-captain
5. **Analyze** → Get AI insights
6. **Compare** → View comparative analysis

## 🎨 UI Features

### Responsive Design
- Mobile-friendly interface
- Tab-based navigation
- Clear visual hierarchy
- Loading states and feedback

### Interactive Elements
- Drag & drop file upload
- Real-time validation
- Dynamic team selection
- Live captain/vice-captain updates

## 🚨 Error Handling

### Common Issues
- **File format**: Ensure correct CSV format or image types
- **File size**: Check size limits (1MB CSV, 5MB images)
- **Team count**: Maximum 10 teams for screenshots
- **Player count**: Maximum 11 players per team

### Validation
- CSV header validation
- Player name validation
- Team selection validation
- Match details validation

## 📈 Use Cases

### Fantasy Cricket Managers
- Compare multiple team strategies
- Identify popular player picks
- Analyze team balance trends
- Optimize captain/vice-captain choices

### Tournament Analysis
- Track team composition patterns
- Identify meta strategies
- Analyze player popularity
- Compare different approaches

### Research & Learning
- Study successful team structures
- Understand player preferences
- Analyze strategic trends
- Learn from AI insights

## 🔮 Future Enhancements

### Planned Features
- **Player Statistics**: Historical performance data
- **Venue Analysis**: Pitch-specific recommendations
- **Form Tracking**: Recent player performance
- **Export Results**: Download analysis reports
- **Team Templates**: Save and reuse team structures

### Advanced Analytics
- **Predictive Modeling**: Win probability analysis
- **Risk Assessment**: Detailed risk analysis
- **Optimization**: AI-powered team suggestions
- **Trend Analysis**: Historical pattern recognition

---

## 🆘 Support

### Getting Help
1. **Check the CSV template** in the app
2. **Verify file formats** and sizes
3. **Ensure clear screenshots** for OCR
4. **Contact support** if issues persist

### Best Practices
- **Use clear screenshots** for better OCR accuracy
- **Follow CSV format** exactly
- **Select diverse teams** for better comparison
- **Review AI insights** carefully before making decisions

---

**Happy Analyzing! 🏏📊** 