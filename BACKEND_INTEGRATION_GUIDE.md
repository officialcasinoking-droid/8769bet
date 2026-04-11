# Backend Integration Guide

## Overview
This document describes the backend integration for 8769bet platform.

## Architecture

### Backend (Express + WebSocket)
- **Location**: `backend/`
- **Port**: 3006
- **Tech**: Node.js, Express, WebSocket (ws)
- **Database**: Supabase (PostgreSQL)

### Services Implemented

#### 1. Authentication System ✅
- **Login**: `POST /api/auth/login`
- **Signup**: `POST /api/auth/signup`
- **Forgot Password**: `POST /api/auth/forgot-password`
- **Reset Password**: `POST /api/auth/reset-password`
- **Change Password**: `POST /api/auth/change-password`
- **Get Current User**: `GET /api/auth/me`

**Database Integration**: 
- Uses Supabase `users` table
- Real user model with database queries
- Referral system integration
- Email service for password reset

#### 2. Aviator Game Engine ✅
- **WebSocket**: `ws://localhost:3006/ws/aviator`
- **Game State API**: `GET /api/aviator/state`
- **Manual Crash**: `POST /api/aviator/crash`
- **Settings**: `POST /api/aviator/settings`
- **Place Bet**: `POST /api/aviator/bet`
- **Cash Out**: `POST /api/aviator/cashout`
- **House Edge**: `GET /api/aviator/house-edge`

**Features**:
- Real-time game state broadcasting via WebSocket
- Automated bot bets (15 bots per round)
- House edge management (off/smart/aggressive)
- Auto-cashout processing
- Crash history tracking

#### 3. Admin Routes
- **Landing Content**: `GET/POST /api/admin/landing/*`
- **Wallet**: `GET /api/admin/wallet`
- **Transactions**: `GET /api/admin/transactions`
- **Withdrawals**: `GET/POST /api/admin/withdrawals`

## Frontend Integration

### Connecting to Backend WebSocket

The Aviator game should connect to the backend WebSocket instead of using Supabase Edge Functions.

**WebSocket Connection**:
```javascript
const ws = new WebSocket('ws://localhost:3006/ws/aviator')

ws.onopen = () => {
  console.log('Connected to game server')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  switch(data.type) {
    case 'game_state':
      // Update game UI
      break
    case 'bets_update':
      // Update bets table
      break
  }
}

// Place bet
ws.send(JSON.stringify({
  type: 'place_bet',
  userId: 'user-id',
  username: 'player-name',
  amount: 100,
  autoCashout: 2.0
}))

// Cash out
ws.send(JSON.stringify({
  type: 'cashout',
  userId: 'user-id',
  betNum: 1
}))
```

### Environment Variables

Create `backend/.env` file with:
```env
PORT=3006
JWT_SECRET=your-secret-key
SUPABASE_URL=https://rbcipnwwllkscomatqmc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

## Database Tables Required

### Core Tables
- `users` - User accounts
- `transactions` - Financial transactions
- `withdrawals` - Withdrawal requests
- `payment_methods` - Payment method configurations
- `games` - Game catalog
- `referrals` - Referral tracking
- `bonuses` - Bonus records

### Aviator Tables
- `aviator_game_state` - Current game state
- `aviator_settings` - Game configuration
- `aviator_crash_history` - Historical crash data
- `game_bets` - Bet records
- `game_rounds` - Game round history
- `password_reset_tokens` - Password reset tokens

## Running the Backend

```bash
cd backend
npm install
npm run dev
```

The server will start on port 3006 with WebSocket on `/ws/aviator`.

## Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Change JWT_SECRET** - Use a strong random string
3. **Update Supabase keys** - Use your actual Supabase project keys
4. **Email configuration** - Required for password reset functionality
5. **CORS** - Update allowed origins in production

## Next Steps

1. ✅ Connect backend to Supabase database
2. ✅ Implement password reset email service
3. ⏳ Integrate frontend with backend WebSocket
4. ⏳ Add AI predictions to game flow
5. ⏳ Implement provably fair verification UI
6. ⏳ Add notification system
7. ⏳ Implement payment gateway integration
8. ⏳ Add remaining games (Fortune Gems, Money Coming, etc.)
