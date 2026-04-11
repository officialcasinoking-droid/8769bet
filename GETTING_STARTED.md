# 🚀 Getting Started with 8769bet

This guide will get you up and running in 5 minutes!

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in separate terminal)
cd frontend
npm install
```

### Step 2: Configure Backend

```bash
# In backend directory
# The .env file is already created with placeholder values
# For production, update these in backend/.env:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - SMTP credentials (optional for development)
```

### Step 3: Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Backend running on `http://localhost:3006`  
✅ WebSocket on `ws://localhost:3006/ws/aviator`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running on `http://localhost:5173`

---

## 🎮 Test the Platform

### 1. Login with Demo Account
Navigate to `http://localhost:5173/login`

**Demo User:**
- Username: `demo`
- Password: `demo123`

**Admin:**
- Username: `admin`
- Password: `admin123`

### 2. Play Aviator Game
1. Navigate to Games page
2. Click on Aviator
3. Place a test bet
4. Watch the game in real-time

### 3. Check Admin Panel
1. Login as admin
2. Navigate to Admin Dashboard
3. Check Aviator Control Panel
4. View game statistics

---

## 📚 Next Steps

### Read the Documentation
1. **[PROJECT_README.md](PROJECT_README.md)** - Complete project overview
2. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What's been implemented
3. **[BACKEND_INTEGRATION_GUIDE.md](BACKEND_INTEGRATION_GUIDE.md)** - Backend API details
4. **[IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md)** - Progress tracking

### Explore the Code
- `backend/src/controllers/authController.js` - Authentication logic
- `backend/src/gameEngine.js` - Aviator game engine
- `backend/src/models/` - Database models
- `frontend/src/components/games/AviatorGame.jsx` - Aviator UI
- `frontend/src/api/aviatorWebSocket.js` - WebSocket client

### Test API Endpoints
```bash
# Test login
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'

# Check health
curl http://localhost:3006/api/health

# Get Aviator state
curl http://localhost:3006/api/aviator/state
```

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if port 3006 is available
# Windows:
netstat -ano | findstr :3006

# Kill process if needed
taskkill /F /PID <PID>
```

### Missing dependencies
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors
- Verify Supabase credentials in `.env`
- Check Supabase project is active
- Ensure database tables exist (see SQL files)

---

## 📖 Environment Variables

### Backend (.env)
```env
PORT=3006                          # Server port
JWT_SECRET=your-secret             # Change this!
SUPABASE_URL=your-url             # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=key     # Service role key
SMTP_HOST=smtp.gmail.com          # Email server
SMTP_PORT=587                     # Email port
SMTP_USER=your-email              # Email address
SMTP_PASS=your-password           # Email password
FRONTEND_URL=http://localhost:5173 # CORS
```

### Frontend (optional for now)
```env
VITE_BACKEND_WS_URL=ws://localhost:3006
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

---

## 🎯 Current Status

### ✅ Working
- Backend server with Supabase integration
- Authentication with real database
- Password reset with email service
- WebSocket game engine
- Admin control panel
- Transaction tracking
- Referral system

### ⏳ Needs Frontend Integration
- WebSocket connection to backend
- AI predictions display
- Notification system
- Provably fair verification

---

## 🆘 Need Help?

1. Check the documentation files
2. Review console logs for errors
3. Verify environment variables
4. Check browser console for frontend errors
5. Ensure backend is running before testing frontend

---

**Ready to develop!** 🚀

Start exploring the code and check the implementation progress document for next steps.
