# 8769bet - AI Agent Gaming Platform

## Project Overview

8769bet (also branded as 399bet) is a **full-stack betting and gaming platform** with AI-powered predictions, primarily focused on **crash-style games** (like Aviator). It features a modern dark-themed, neon-accented UI with comprehensive admin controls, user management, and real-time multiplayer gaming.

**Target Market**: Pakistan and India (supports PKR, INR, USD currencies)  
**Payment Methods**: JazzCash, EasyPaisa, UPI, Paytm, PhonePe, USDT (TRC20), Bitcoin

---

## Architecture

```
8769bet/
├── frontend/              # User-facing React application (Vite + React 19)
├── admin/                 # Admin dashboard (React 18 + Vite 5)
├── backend/               # Node.js Express server with WebSocket
├── supabase/              # Database migrations and Edge Functions
├── ai-agent-landing/      # Promotional AI agent landing page
└── images/                # Static assets and reference images
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 6, Tailwind CSS, Framer Motion, React Router DOM 7, Zustand, Supabase Client |
| **Admin** | React 18, Vite 5, Tailwind CSS 3, Framer Motion 10, TanStack Query |
| **Backend** | Node.js, Express 4, WebSocket (ws), JWT Auth, Supabase SDK |
| **Database** | Supabase (PostgreSQL) with Row Level Security, Realtime subscriptions |
| **AI** | Groq API (Llama 3.3 70B) via Supabase Edge Functions |
| **Deployment** | Render (configured via `render.yaml` for 3 services) |

---

## Key Features

### ✅ Fully Implemented

- **Aviator Crash Game** - Real-time multiplayer crash game with backend WebSocket
- **Backend Game Engine** - Continuous game loop with bot bets, auto-cashouts, house edge
- **Authentication** - Login/Register with JWT tokens
- **User Profile** - Balance management, withdrawal PIN, account settings
- **Deposit/Withdrawal UI** - Multiple payment methods interface
- **Referral System** - 3-tier bonus structure
- **Jackpot Tiers** - Mini/Minor/Major/Grand progressive jackpots
- **Admin Dashboard** - Game management, user management, landing page editor
- **Support System** - Real-time ticket/chat system
- **AI Agent Settings** - Groq API configuration in admin
- **Multi-currency** - PKR, INR, USD support

### ⏳ Partially Implemented / Planned

- Payment gateway integration (UI exists, no real payment processing)
- Additional games (Fortune Gems 3, Money Coming, Crazy777, etc.)
- Social login (Google OAuth, Telegram)
- Notification system
- Provably fair verification UI

---

## Game Architecture (Aviator)

### Backend Game Engine (`backend/src/gameEngine.js`)

The Aviator game runs on the backend with:
- **Continuous game loop** using `setInterval` (33ms ticks, ~30fps)
- **Game phases**: betting (8s) → flying → crashed (3s wait) → new round
- **Multiplier formula**: `e^(0.06 * elapsed_seconds)`
- **15 bot bets** per round with randomized Pakistani names
- **Auto-cashout** processing
- **House edge modes**: off/smart/aggressive
- **WebSocket broadcast** to all connected clients

### Frontend Integration

- **WebSocket Client**: `frontend/src/api/aviatorWebSocket.js`
- **Game Component**: `frontend/src/components/games/AviatorGame.jsx`
- **Admin Panel**: `frontend/src/components/admin/AviatorControlPanel.jsx`
- Both subscribe to `ws://localhost:3006/ws/aviator` for real-time updates

### API Endpoints

```
POST /api/auth/login           # User login
POST /api/auth/signup          # User registration
POST /api/auth/forgot-password # Password reset request
POST /api/auth/reset-password  # Password reset with token
GET  /api/auth/me              # Get current user

GET  /api/aviator/state        # Current game state
POST /api/aviator/crash        # Manual crash (admin)
POST /api/aviator/settings     # Update settings (admin)
POST /api/aviator/bet          # Place bet
POST /api/aviator/cashout      # Cash out bet
GET  /api/aviator/house-edge   # House edge stats

GET  /api/admin/landing/content        # Get landing content
POST /api/admin/landing/draft          # Update draft
POST /api/admin/landing/publish        # Publish content
GET  /api/admin/wallet                 # Admin wallet
GET  /api/admin/transactions           # All transactions
GET  /api/admin/withdrawals            # Withdrawal requests
```

---

## Building and Running

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for database)

### Backend

```bash
cd backend
npm install
npm run dev        # Development (auto-reload)
npm start          # Production
```

Backend runs on `http://localhost:3006` with WebSocket at `ws://localhost:3006/ws/aviator`

### Frontend

```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
```

Frontend runs on `http://localhost:5173`

### Admin Dashboard

```bash
cd admin
npm install
npm run dev
npm run build
```

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3006
JWT_SECRET=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.onrender.com
VITE_BACKEND_WS_URL=ws://localhost:3006
```

---

## Database

### Schema Files
- `SUPABASE_SCHEMA.sql` - Core database schema
- `SUPABASE_GAME_TABLES.sql` - Game-specific tables
- `supabase/migrations/` - Migration files

### Key Tables
- `users` - User accounts and balances
- `transactions` - Financial transaction history
- `games` - Game catalog
- `game_rounds` - Game round history
- `player_bets` - All bets (users + bots)
- `admin_wallet` - House edge tracking
- `aviator_game_state` - Current live game state
- `aviator_settings` - Game configuration

---

## Deployment

### Render Configuration

The project is configured for deployment on Render with 3 services (see `render.yaml`):
1. **Frontend** - Static site
2. **Admin** - Static site
3. **Backend** - Node.js web service

### Production Checklist
- [ ] Update all environment variables for production
- [ ] Set up production Supabase project
- [ ] Configure production SMTP
- [ ] Enable HTTPS/SSL
- [ ] Set up CDN for assets
- [ ] Configure rate limiting
- [ ] Enable monitoring/logging
- [ ] Set up backups

---

## Demo Accounts

**Demo User**:
- Username: `demo`
- Password: `demo123`
- Balance: 5,000 PKR

**Admin**:
- Username: `admin`
- Password: `admin123`
- Balance: 100,000 PKR

---

## Development Conventions

### Code Style
- Frontend: React functional components with hooks
- Backend: ES modules (import/export)
- Consistent naming: camelCase for variables/functions, PascalCase for components
- Tailwind CSS for styling with custom theme

### Architecture Patterns
- Frontend: Component-based architecture with context for state management
- Backend: MVC pattern with controllers, routes, models
- WebSocket for real-time communication
- REST API for CRUD operations

### Testing
- Manual testing with demo accounts
- Backend endpoints testable via curl/Postman
- WebSocket connections testable via browser dev tools

---

## Important Notes

### Security
- ⚠️ **Never commit `.env` files** - They contain sensitive credentials
- ⚠️ Change JWT_SECRET in production
- ⚠️ Use environment-specific Supabase keys
- ⚠️ Service role key only used in backend (never frontend)

### Known Limitations
- Payment processing is UI-only (no actual gateway integration)
- Some games are placeholder cards (only Aviator is fully implemented)
- Social login shows "coming soon"
- Email service requires SMTP configuration

---

## Documentation Files

- `README.md` - Project overview
- `PROJECT_README.md` - Complete project overview
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `MIGRATION_TO_SUPABASE.md` - Database migration guide
- `BACKEND_INTEGRATION_GUIDE.md` - Backend API documentation
- `QUICK_START.md` - Quick start guide
- `DEPLOYMENT_COMPLETE.md` - Deployment checklist
- `MANUAL_DEPLOYMENT_GUIDE.md` - Step-by-step deployment instructions

---

## Repository

- **GitHub**: https://github.com/officialcasinoking-droid/8769bet
- **Branch**: main
- **Latest Commit**: Check `git log` for latest

---

**Last Updated**: April 11, 2026  
**Status**: Backend + Frontend integrated with WebSocket, ready for testing
