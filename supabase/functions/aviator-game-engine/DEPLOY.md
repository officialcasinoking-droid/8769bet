# Supabase Edge Function Deployment Guide

## Overview
This guide explains how to deploy the Aviator Game Engine as a Supabase Edge Function that runs 24/7 in the cloud.

---

## 🚀 Quick Deploy (5 minutes)

### Step 1: Install Supabase CLI
```bash
# npm
npm install -g supabase

# Or use npx
npx supabase --version
```

### Step 2: Login to Supabase
```bash
supabase login
```
This will open a browser window for authentication.

### Step 3: Link Your Project
```bash
cd "e:\Programming\qoder workspace\8769bet"
supabase link --project-ref rbcipnwwllkscomatqmc
```

### Step 4: Run Database Migrations
```bash
supabase db push
```
This will create all necessary tables and policies.

### Step 5: Deploy Edge Function
```bash
supabase functions deploy aviator-game-engine \
  --import-map supabase/functions/aviator-game-engine/import_map.json \
  --no-verify-jwt
```

### Step 6: Set Environment Variables
```bash
# Set Supabase URL
supabase secrets set SUPABASE_URL=https://rbcipnwwllkscomatqmc.supabase.co

# Set Service Role Key (get from Supabase Dashboard > Settings > API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 7: Test the Function
```bash
supabase functions serve aviator-game-engine --env-file supabase/.env
```

---

## 📋 Database Schema

The migration file `002_aviator_game_engine_complete.sql` creates:

### Tables Created
1. **game_rounds** - History of all game rounds
2. **player_bets** - All bets (real users + bots)
3. **admin_wallet** - House edge tracking and wallet
4. **aviator_game_state** - Current live game state (single row)
5. **aviator_settings** - Game configuration
6. **aviator_crash_history** - Quick access to crash points
7. **aviator_admin_signals** - Admin control signals

### Realtime Enabled
All tables are published to Supabase Realtime for instant updates.

### RLS Policies
- Anyone can READ game state and bets
- Only authenticated users can place bets
- Only service role (Edge Function) can modify game state
- Admins can update settings and view wallet

---

## 🔧 Edge Function Details

### Location
`supabase/functions/aviator-game-engine/index.ts`

### What It Does
1. **Runs continuously** - Game loop runs every 50ms
2. **Generates crash points** - Provably fair algorithm
3. **Places bot bets** - 15 bots per round
4. **Processes auto-cashouts** - Automatic payouts
5. **Updates admin wallet** - House edge tracking
6. **Broadcasts state** - Via Supabase Realtime
7. **Handles admin controls** - Force crash, new round, pause/resume

### Game Phases
1. **Betting (8 seconds)** - Players place bets, bots join
2. **Flying** - Multiplier increases exponentially
3. **Crashed** - Round ends, payouts processed, new round starts in 3s

### House Edge Modes
- **off** - Natural crash points
- **smart** - Moderate house edge enforcement
- **aggressive** - Higher house edge, faster crashes

---

## 🌐 Frontend Integration

### Update Imports
Replace old imports in `AviatorGame.jsx` and `AviatorControlPanel.jsx`:

```javascript
// OLD (remove these)
import { subscribeToGameState, ... } from '../../api/aviator'

// NEW (use these)
import { 
  subscribeToGameState,
  placeBet,
  cashoutBet,
  adminForceCrash,
  adminNewRound,
  adminUpdateSettings,
  fetchGameState,
  fetchCurrentBets,
  fetchCrashHistory
} from '../../api/aviatorSupabase'
```

### Subscription Example
```javascript
useEffect(() => {
  const cleanup = subscribeToGameState(
    // Game state callback
    (state) => {
      console.log('Phase:', state.phase)
      console.log('Multiplier:', state.mult)
      console.log('Countdown:', state.countdown)
    },
    // Bets callback
    (bets) => {
      console.log('Live bets:', bets.length)
    },
    // Settings callback
    (settings) => {
      console.log('Settings updated:', settings)
    }
  )

  return cleanup
}, [])
```

### Place Bet Example
```javascript
const result = await placeBet({
  userId: user.id,
  username: user.username,
  amount: 100,
  autoCashout: 2.0,
  betNumber: 1
})

if (result.success) {
  console.log('Bet placed:', result.bet)
}
```

### Cashout Example
```javascript
const result = await cashoutBet(user.id, 1)

if (result.success) {
  console.log('Won:', result.winAmount)
  console.log('At:', result.multiplier)
}
```

---

## 🎛️ Admin Controls

### Force Crash
```javascript
const result = await adminForceCrash()
```

### New Round
```javascript
const result = await adminNewRound()
```

### Update Settings
```javascript
const result = await adminUpdateSettings({
  houseEdge: 0.05,      // 5%
  heMode: 'off',        // 'off' | 'smart' | 'aggressive'
  heMinSecs: 3,
  heMaxSecs: 50,
  waitTimeSeconds: 8
})
```

### Pause/Resume
```javascript
await adminPause()
await adminResume()
```

---

## 📊 Monitoring

### Check if Edge Function is Running
```bash
supabase functions serve aviator-game-engine --env-file supabase/.env
```

### View Logs
```bash
# Local development
supabase functions serve aviator-game-engine

# Production (via Supabase Dashboard)
# Go to Edge Functions > aviator-game-engine > Logs
```

### Check Game State
```javascript
const state = await fetchGameState()
console.log('Current phase:', state.phase)
console.log('Multiplier:', state.multiplier)
console.log('Round ID:', state.round_id)
```

### Check Admin Wallet
```javascript
const wallet = await fetchAdminWallet()
console.log('Balance:', wallet.balance)
console.log('House Edge Earned:', wallet.house_edge_earned)
console.log('Rounds Played:', wallet.rounds_played)
```

---

## 🔐 Security Notes

### Service Role Key
- **NEVER** expose the service role key in frontend code
- Only use in Edge Functions and backend
- The Edge Function has full database access

### RLS Policies
- Users can only place their own bets
- Only the Edge Function can modify game state
- Admins can view wallet and update settings
- Everyone can view game state and bets (required for real-time display)

### Environment Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Keep this secret!
```

---

## 🐛 Troubleshooting

### Edge Function Not Starting
```bash
# Check logs
supabase functions serve aviator-game-engine

# Verify environment variables
supabase secrets list

# Re-deploy
supabase functions deploy aviator-game-engine --no-verify-jwt
```

### Game Not Updating
1. Check if Edge Function is running
2. Verify Supabase Realtime is enabled on tables
3. Check browser console for subscription errors
4. Verify RLS policies allow read access

### Bets Not Appearing
1. Check user is authenticated
2. Verify game is in 'betting' phase
3. Check RLS policies allow bet insertion
4. Review Edge Function logs for errors

### Admin Controls Not Working
1. Verify admin is authenticated with proper role
2. Check Edge Function is deployed and running
3. Review admin signals table for pending actions
4. Check browser console for errors

---

## 📈 Performance Optimization

### Subscription Management
- Subscribe once on component mount
- Unsubscribe on component unmount
- Don't create multiple subscriptions to same table

### Data Fetching
- Fetch initial state immediately
- Let Realtime handle updates
- Don't poll - use subscriptions

### Bot Bets
- Bots are placed with random delays
- Prevents database write spikes
- Simulates natural betting pattern

---

## 🎯 Testing Checklist

- [ ] Edge Function deployed successfully
- [ ] All database tables created
- [ ] Realtime subscriptions working
- [ ] Game state updates every 50ms
- [ ] Bot bets appearing in UI
- [ ] Player bets working
- [ ] Auto-cashouts processing
- [ ] Admin force crash working
- [ ] Admin new round working
- [ ] Settings updates syncing
- [ ] Admin wallet updating
- [ ] Crash history populating
- [ ] No console errors in browser

---

## 🚀 Production Deployment

### Supabase Dashboard
1. Go to your project: https://app.supabase.com
2. Navigate to Edge Functions
3. Click on `aviator-game-engine`
4. Click "Deploy to Production"
5. Verify environment variables are set

### Verify Deployment
```bash
# Test production endpoint
curl -X POST https://rbcipnwwllkscomatqmc.supabase.co/functions/v1/aviator-game-engine \
  -H "Content-Type: application/json" \
  -d '{"action": "get_state"}'
```

### Monitor
- Set up alerts in Supabase Dashboard
- Monitor function execution count
- Watch for errors in logs
- Check database query performance

---

## 💰 Costs

### Supabase Free Tier
- **500 MB** database storage
- **2 GB** bandwidth per month
- **Unlimited** API requests
- **Unlimited** Realtime subscriptions
- **Edge Functions**: 500k invocations/month

### Estimated Usage
- Game state updates: ~20/second = 1.7M/day
- This exceeds free tier, so consider:
  - Reducing tick rate to 100ms (10/second)
  - Upgrading to Pro plan ($25/month)
  - Using batched updates

### Cost Optimization
The current 50ms tick rate creates 20 updates/second. To reduce costs:
1. Increase `TICK_INTERVAL_MS` to 100ms (recommended)
2. Batch multiple state changes
3. Use edge function cron instead of continuous loop

---

## 📞 Support

For issues:
1. Check Supabase Dashboard > Logs
2. Review Edge Function error messages
3. Verify database connectivity
4. Check browser console for client errors

---

**Last Updated**: April 11, 2026  
**Status**: Ready for deployment  
**Version**: 1.0.0
