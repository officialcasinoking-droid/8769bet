# 🎰 8769bet - AI-Powered Betting Platform

A modern, full-stack betting and gaming platform with AI-powered predictions, real-time multiplayer games, and comprehensive admin controls.

**Current Status**: Phase 1 Complete - Backend Integration ✅  
**Last Updated**: April 11, 2026

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- SMTP credentials (for email, optional for development)

### Installation

#### 1. Backend Setup
```bash
cd backend
npm install
```

#### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
# Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

#### 3. Start Backend
```bash
npm run dev
```
Backend runs on `http://localhost:3006` with WebSocket at `ws://localhost:3006/ws/aviator`

#### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Implementation Summary](IMPLEMENTATION_SUMMARY.md) | **START HERE** - What's been implemented |
| [Backend Integration Guide](BACKEND_INTEGRATION_GUIDE.md) | Backend API and WebSocket documentation |
| [Implementation Progress](IMPLEMENTATION_PROGRESS.md) | Detailed progress tracking and next steps |
| [Schema Documentation](SUPABASE_SCHEMA.sql) | Database schema |
| [Game Tables](SUPABASE_GAME_TABLES.sql) | Game-specific database tables |

---

## 🎮 Features

### ✅ Fully Implemented
- **Aviator Crash Game** - Real-time multiplayer crash game
- **Backend Integration** - Supabase database connection
- **Authentication** - Secure login with password reset
- **Email Service** - Password reset and welcome emails
- **Admin Dashboard** - Complete game management
- **Referral System** - 3-tier bonus structure
- **WebSocket Client** - Ready for frontend integration
- **Transaction Tracking** - Full financial history

### ⏳ In Development
- AI Predictions Integration
- Notification System
- Provably Fair Verification UI
- Payment Gateway Integration
- Additional Games (Fortune Gems, Money Coming, etc.)
- Social Login (Google, Telegram)

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, Vite 6, Tailwind CSS, Framer Motion, Zustand
- **Backend**: Node.js, Express 4, WebSocket (ws)
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq API (Llama 3.3 70B)
- **Real-time**: WebSocket for game state broadcasting
- **Deployment**: Render (configured via `render.yaml`)

### Project Structure
```
8769bet/
├── backend/                    # Backend server
│   ├── src/
│   │   ├── controllers/       # Route controllers
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic services
│   │   ├── routes/           # API routes
│   │   ├── lib/              # Library configurations
│   │   └── gameEngine.js     # Aviator game engine
│   └── .env                  # Environment variables
├── frontend/                   # React frontend
│   └── src/
│       ├── api/              # API clients
│       ├── components/       # React components
│       ├── context/          # React contexts
│       └── pages/            # Page components
├── admin/                      # Admin dashboard
├── supabase/                   # Database migrations
│   ├── migrations/            # SQL migrations
│   └── functions/             # Edge functions
└── ai-agent-landing/           # AI promotional page
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login           # User login
POST /api/auth/signup          # User registration
POST /api/auth/forgot-password # Request password reset
POST /api/auth/reset-password  # Reset password with token
POST /api/auth/change-password # Change password (authenticated)
GET  /api/auth/me              # Get current user (authenticated)
```

### Aviator Game
```
WebSocket /ws/aviator          # Real-time game state
GET  /api/aviator/state        # Current game state
POST /api/aviator/crash        # Manual crash (admin)
POST /api/aviator/settings     # Update settings (admin)
POST /api/api/aviator/bet      # Place bet
POST /api/aviator/cashout      # Cash out bet
GET  /api/aviator/house-edge   # House edge stats
```

### Admin
```
GET    /api/admin/landing/content        # Get landing content
POST   /api/admin/landing/draft          # Update draft content
POST   /api/admin/landing/publish        # Publish content
POST   /api/admin/landing/upload         # Upload images
GET    /api/admin/wallet                 # Get wallet info
GET    /api/admin/transactions           # Get all transactions
GET    /api/admin/withdrawals            # Get withdrawal requests
POST   /api/admin/withdrawals/:id        # Approve/reject withdrawals
POST   /api/admin/withdrawal/settings    # Update withdrawal settings
```

---

## 🎯 WebSocket Integration

The Aviator game uses WebSocket for real-time communication:

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3006/ws/aviator')
```

### Message Types

**Server → Client:**
- `game_state` - Current game phase, multiplier, countdown
- `bets_update` - Updated bet list
- `settings_updated` - Game settings changes
- `bet_result` - Result of placed bet
- `cashout_result` - Result of cashout attempt

**Client → Server:**
- `place_bet` - Place a new bet
- `cashout` - Cash out active bet
- `manual_crash` - Force crash (admin)
- `update_settings` - Update game settings (admin)

### Example Usage
```javascript
import { aviatorWS } from './api/aviatorWebSocket'

// Connect
aviatorWS.connect()

// Subscribe to game state
aviatorWS.on('game_state', (state) => {
  console.log('Phase:', state.phase)
  console.log('Multiplier:', state.mult)
})

// Place bet
aviatorWS.placeBet({
  userId: 'user-123',
  username: 'player1',
  amount: 100,
  autoCashout: 2.0
})
```

---

## 🗄️ Database

### Core Tables
- `users` - User accounts and balances
- `transactions` - Financial transaction history
- `withdrawals` - Withdrawal requests
- `payment_methods` - Available payment methods
- `games` - Game catalog
- `referrals` - Referral tracking
- `bonuses` - Bonus records
- `password_reset_tokens` - Password reset tokens

### Game Tables
- `aviator_game_state` - Current game state
- `aviator_settings` - Game configuration
- `aviator_crash_history` - Historical crash data
- `game_bets` - Bet records
- `game_rounds` - Game round history

### Running Migrations
```bash
# Apply all migrations
cd supabase
# Run migration files in order
psql -f migrations/001_password_reset_tokens.sql
```

---

## 🔐 Security

### Implemented Security Measures
✅ Secrets in environment variables  
✅ `.env` excluded from git  
✅ Password hashing with bcrypt  
✅ JWT authentication  
✅ Token expiry for password resets  
✅ Input validation on all endpoints  
✅ Row Level Security in Supabase  

### Security Best Practices
- Never commit `.env` files
- Use strong JWT secrets
- Rotate Supabase service role keys
- Enable 2FA for admin accounts
- Regular security audits
- Monitor failed login attempts

---

## 🧪 Testing

### Test Accounts
```
Demo User:
Username: demo
Password: demo123
Balance: 5,000 PKR

Admin:
Username: admin
Password: admin123
Balance: 100,000 PKR
```

### Manual Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173`
4. Login with demo credentials
5. Navigate to Aviator game
6. Place test bets
7. Check admin panel for game controls

---

## 🚀 Deployment

### Render Deployment
The project is configured for deployment on Render with 3 services:
- Frontend (static site)
- Admin dashboard (static site)
- Backend (web service)

See `render.yaml` for configuration.

### Production Checklist
- [ ] Update all environment variables
- [ ] Set up production Supabase project
- [ ] Configure production SMTP
- [ ] Enable HTTPS/SSL
- [ ] Set up CDN for assets
- [ ] Configure rate limiting
- [ ] Enable monitoring/logging
- [ ] Set up backups
- [ ] Test payment integrations
- [ ] Security audit

---

## 📊 Implementation Status

| Feature | Status | Progress |
|---------|--------|----------|
| Backend Integration | ✅ Complete | 100% |
| Email Service | ✅ Complete | 100% |
| Security | ✅ Complete | 100% |
| WebSocket Client | ✅ Complete | 100% |
| Frontend WS Integration | 📝 Ready | 0%* |
| AI Predictions | ⏳ Pending | 0% |
| Notification System | ⏳ Pending | 0% |
| Provably Fair UI | ⏳ Pending | 0% |
| Payment Gateway | ⏳ Pending | 0% |
| Additional Games | ⏳ Pending | 0% |

*WebSocket client created, needs to be wired into components

**Overall Progress**: ~25% complete

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

## 📝 License

Private - All rights reserved

---

## 📞 Support

For technical support or questions:
- Check documentation in `/docs` folder
- Review implementation summary
- Check backend integration guide

---

**Version**: 1.0.0  
**Phase**: 1 of 3 (Backend Integration Complete)  
**Last Updated**: April 11, 2026
