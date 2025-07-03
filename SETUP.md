# Dream11 Team Analyzer - Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 16+ installed
- OCR.space API key (free)
- OpenAI API key (optional, for AI analysis)

### Step 1: Clone/Download Project

```bash
# If you have the project files, navigate to the project directory
cd Dream11-Team-Analyzer

# Your project structure should look like:
# ├── frontend/
# │   ├── index.html
# │   └── script.js
# ├── backend/
# │   ├── server.js
# │   ├── package.json
# │   └── env-example.txt
# ├── README.md
# └── SETUP.md
```

### Step 2: Get API Keys

#### OCR.space API Key (Free - Required)
1. Go to [OCR.space API](https://ocr.space/ocrapi)
2. Click "Register for Free API Key"
3. Enter your email and get your API key
4. Free tier: 25,000 requests/month

#### OpenAI API Key (Optional - For AI Analysis)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign up/Login and create a new API key
3. Copy the key (starts with `sk-`)
4. Note: This costs money per request

### Step 3: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file from template
cp env-example.txt .env

# Edit .env file with your API keys
```

Edit `backend/.env` file:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
OCR_API_KEY=your_ocr_space_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** Replace `your_ocr_space_api_key_here` with your actual OCR.space API key!

```bash
# Start the backend server
npm start
```

You should see:
```
✅ Server running on http://localhost:3001
✅ OCR API configured
✅ OpenAI API configured (or ❌ if not configured)
```

### Step 4: Frontend Setup

Open a **new terminal window** and:

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Start a simple HTTP server
python -m http.server 3000
```

**Alternative methods:**
```bash
# Using Node.js http-server
npx http-server -p 3000 -c-1

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

### Step 5: Test the Application

1. **Open browser:** `http://localhost:3000`
2. **Verify backend:** `http://localhost:3001/api/health`
3. **Upload test:** Try uploading a Dream11 screenshot
4. **Check console:** Look for any errors in browser developer tools

## 📱 How to Use

### 1. Upload Dream11 Screenshot
- Take a screenshot of your Dream11 team selection screen
- Make sure player names are clearly visible
- Drag & drop or click to upload (JPG/PNG, max 5MB)

### 2. Fill Match Details
- **Team A & B:** Select from IPL 2025 teams dropdown
- **Match Date:** Choose the match date
- **Important:** Teams must be different

### 3. View Extracted Data
- App will automatically extract 11 players
- Captain (C) and Vice-Captain (VC) will be detected
- Review the extracted information

### 4. Get AI Analysis (Optional)
- Click "🤖 Get AI Analysis" if you have OpenAI API key
- Wait for detailed team analysis and suggestions

## 🛠️ Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check if Node.js is installed
node --version

# Should show v16+ or higher
# If not installed, download from https://nodejs.org
```

#### "OCR API key not configured"
1. Check your `.env` file exists in `backend/` folder
2. Verify the API key is correct (no extra spaces)
3. Restart backend server after editing `.env`

#### Frontend Shows Blank Page
1. Make sure you're accessing `http://localhost:3000`
2. Check browser console for JavaScript errors
3. Verify frontend server is running

#### "Failed to fetch" Error
1. **Check backend is running:** Go to `http://localhost:3001/api/health`
2. **Port conflicts:** Make sure nothing else uses port 3001
3. **CORS issues:** Ensure frontend runs on port 3000

#### OCR Not Detecting Players
1. **Screenshot quality:** Ensure text is clear and readable
2. **Supported format:** Use JPG or PNG only
3. **File size:** Keep under 5MB
4. **Player names visible:** Names should be clearly visible in screenshot

#### Captain/Vice-Captain Not Detected
- Make sure C and VC markers are visible in screenshot
- The improved detection looks for C/VC markers near player names
- If still not working, you can see debug info in backend terminal

### Development Mode

For development with auto-reload:

```bash
# Backend with nodemon
cd backend
npm run dev

# Frontend - no change needed, just refresh browser
```

## 📂 Project Structure

```
dream11-analyzer/
├── frontend/
│   ├── index.html          # Main web page
│   └── script.js           # Frontend JavaScript
├── backend/
│   ├── server.js           # Express server
│   ├── package.json        # Node.js dependencies
│   ├── package-lock.json   # Dependency lock file
│   └── env-example.txt     # Environment variables template
├── README.md               # Project overview
├── SETUP.md               # This setup guide
└── DEVELOPMENT_PLAN.md    # Development roadmap
```

## 🔧 API Endpoints

The backend provides these endpoints:

- `GET /api/health` - Check server status
- `GET /api/teams` - Get IPL 2025 teams list
- `POST /api/ocr/process` - Process screenshot with OCR
- `POST /api/analyze` - Get AI team analysis (requires OpenAI API key)

## 💡 Pro Tips

1. **Better OCR Results:**
   - Use high-quality screenshots
   - Ensure good lighting/contrast
   - Make sure all player names are fully visible

2. **Save Money:**
   - OCR.space has 25k free requests/month
   - OpenAI charges per request - use sparingly during testing

3. **Performance:**
   - OCR processing takes 2-5 seconds
   - AI analysis takes 5-10 seconds
   - Be patient and don't spam requests

## 🆘 Still Need Help?

1. **Check both terminals** for error messages
2. **Browser Developer Tools** → Console tab for frontend errors
3. **Test with different screenshots** to isolate issues
4. **Verify API keys** are working by testing them directly
5. **Restart both servers** if something seems stuck

## ✅ Success Checklist

- [ ] Node.js 16+ installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] `.env` file created with OCR API key
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Can upload screenshot successfully
- [ ] Players detected correctly
- [ ] Can select teams and date
- [ ] (Optional) AI analysis working

---

**🎯 You're now ready to analyze Dream11 teams!** 

Upload a screenshot and see the magic happen! 🏏 