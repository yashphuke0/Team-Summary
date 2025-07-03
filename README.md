# Dream11 Fantasy Cricket Team Analyzer

A web application that allows users to upload screenshots of their Dream11 fantasy cricket teams or manually input team details, extract player information using OCR, and display the data in a structured JSON format.

## 🚀 Features

### Core Features
- **Screenshot Upload & OCR Processing**: Upload Dream11 team screenshots and automatically extract player details using OCR.space API
- **Manual Team Entry**: Fallback option to manually input player names, captain, vice-captain, and match details
- **JSON Output**: Display extracted team information in a clean, structured JSON format
- **Mobile-First Design**: Responsive UI optimized for mobile devices using TailwindCSS

### Current Capabilities
- Extract player names from screenshots
- Identify captain and vice-captain (marked with "C" and "VC")
- Parse match details (team names, match date)
- Fallback manual entry system
- Mobile-responsive interface

## 🛠️ Tech Stack

**Frontend:**
- HTML5 for structure
- CSS3 with TailwindCSS for responsive styling
- Vanilla JavaScript for functionality and interactions

**APIs:**
- OCR.space API for text extraction from images

**Backend:**
- Currently MVP version with no backend
- Future backend integration planned

## 📋 Prerequisites

- Modern web browser
- OCR.space API key (free tier available)
- Internet connection for API calls

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dream11-team-analyzer
```

2. Set up TailwindCSS:
```bash
# Install via CDN (recommended for MVP) or
# npm install -D tailwindcss
```

3. Get your OCR.space API key:
   - Sign up at [OCR.space](https://ocr.space/ocrapi)
   - Get your free API key
   - Add it to your JavaScript configuration

### Project Structure
```
dream11-team-analyzer/
├── index.html          # Main HTML file
├── style.css           # Custom styles
├── script.js           # JavaScript functionality
├── README.md           # Project documentation
└── summaryOfTeam/
    └── context         # Project context file
```

## 🎯 Usage

### Screenshot Upload Method
1. Open the web application
2. Click on the upload area or drag and drop your Dream11 team screenshot
3. Wait for OCR processing to complete
4. Review the extracted team details in JSON format

### Manual Entry Method
1. Use the manual input form if OCR fails or for custom entry
2. Enter player names (11 players total)
3. Select captain and vice-captain
4. Add match details (teams and date)
5. Submit to generate JSON output

### Expected JSON Output Format
```json
{
  "players": ["Player 1", "Player 2", "Player 3", "..."],
  "captain": "Player X",
  "vice_captain": "Player Y",
  "match": {
    "team_a": "RCB",
    "team_b": "PBKS",
    "match_date": "2025-04-18"
  }
}
```

## 🔧 Configuration

### OCR.space API Setup
1. Replace the API key in `script.js`:
```javascript
const OCR_API_KEY = 'your-ocr-space-api-key';
```

2. Configure API settings as needed:
   - Image format support: JPG, PNG
   - Language: English (default)
   - OCR Engine: 2 (recommended)

## 📱 Mobile Responsiveness

The application is built with a mobile-first approach using TailwindCSS:
- Responsive grid layouts
- Touch-friendly interface elements
- Optimized for various screen sizes
- Progressive enhancement for desktop users

## 🔄 Future Enhancements

### Phase 2: Data Integration
- **Match Data Fetching**: Integration with cricket APIs for live match details
- **Weather Conditions**: OpenWeatherMap API integration for venue weather
- **Player Statistics**: Real-time player form and statistics

### Phase 3: AI Analysis
- **Team Analysis**: AI-powered team strength evaluation
- **Captain Suggestions**: Data-driven captain/vice-captain recommendations
- **Performance Insights**: Team combination optimization

### Phase 4: Advanced Features
- **Head-to-Head Statistics**: Historical team performance data
- **Venue Analysis**: Pitch conditions and historical data
- **Player Form Tracking**: Recent performance metrics

## 🧪 Testing

### OCR Testing
- Test with various screenshot qualities
- Validate different team formats
- Ensure accurate captain/vice-captain detection

### Mobile Testing
- Test across different mobile devices
- Verify responsive design elements
- Check touch interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🙏 Acknowledgments

- OCR.space for providing the OCR API
- TailwindCSS for the responsive design framework
- Dream11 for the fantasy cricket platform inspiration

---

**Note**: This is currently an MVP version focusing on core OCR and manual entry functionality. Advanced features and AI analysis will be added in future releases. 