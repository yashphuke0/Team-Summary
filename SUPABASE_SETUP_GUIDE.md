# 🚀 Supabase Integration Setup Guide

## ✅ **What I've Done**

Your `backend/server.js` has been **completely updated** to use Supabase instead of PostgreSQL:

### **Changes Made:**
- ✅ **Replaced** `pg` (PostgreSQL) with `@supabase/supabase-js`
- ✅ **Updated** all database queries to use Supabase client
- ✅ **Converted** all API endpoints:
  - `/api/team-recent-form` - Now uses Supabase
  - `/api/head-to-head` - Now uses Supabase  
  - `/api/player-performance` - Now uses Supabase
  - `/api/venue-stats` - Now uses Supabase
- ✅ **Updated** `package.json` dependencies
- ✅ **Updated** environment variables template

## 🔑 **Get Your Supabase Credentials**

### **Step 1: Get Supabase URL and API Key**
1. **Go to your Supabase project dashboard**
2. **Click "Settings"** in the left sidebar
3. **Click "API"** in the settings menu
4. **Copy these values:**
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **Anon key** (starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### **Step 2: Update Your Environment File**
1. **Go to** `backend/` folder
2. **Create** `.env` file (copy from `env-example.txt`)
3. **Add your Supabase credentials:**

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OCR.space API Configuration
OCR_API_KEY=your_ocr_space_api_key_here

# OpenAI API Configuration  
OPENAI_API_KEY=your_openai_api_key_here
```

## 🧪 **Test Your Setup**

### **Step 3: Install New Dependencies**
```powershell
# In backend folder
cd backend
npm install
```

### **Step 4: Test Backend Connection**
```powershell
# Start your backend
npm start
```

**You should see:**
```
✅ Supabase connected successfully
🚀 Dream11 Analyzer Backend running on port 3001
```

### **Step 5: Test API Endpoints**
1. **Health Check:** `http://localhost:3001/api/health`
2. **Teams List:** `http://localhost:3001/api/teams`

## 🎯 **What Works Now**

Your backend is now **fully integrated with Supabase**:

✅ **All database queries** use your Supabase database  
✅ **Team analysis** will pull from your IPL data  
✅ **Player statistics** will use your historical data  
✅ **Venue analysis** will use your venue statistics  
✅ **Head-to-head** comparisons work with your data  

## 🚨 **Important Notes**

1. **Database must have data** - Your Supabase tables need to have match/player data for the analysis endpoints to work properly
2. **Row Level Security** - If your Supabase has RLS enabled, make sure the anon key can read the data
3. **API limits** - Supabase free tier has limits, but should be fine for your use case

## 🔧 **Next Steps**

Once your backend is working with Supabase:
1. ✅ **Test all API endpoints** 
2. ✅ **Import your IPL data** (if not done already)
3. ✅ **Create React frontend** 
4. ✅ **Deploy to Vercel**

Your app is now ready for **modern cloud deployment**! 🎉 