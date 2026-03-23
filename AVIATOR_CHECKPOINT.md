# Aviator Crash Game — Implementation Checkpoint

## Overview

Fully autonomous Aviator crash game built on the 8769bet platform. The game engine runs entirely client-side in the game tab. The admin panel is a passive sync display that reads state from localStorage. No interference between the two.

**Supabase project:** `rbcipnwwllkscomatqmc`
**Dev server:** `http://localhost:3005`

---

## Architecture

### Dual-Tab Architecture

- **`AviatorGame.jsx` (Game Tab)** — Authoritative game engine
  - Runs continuously in the browser
  - Generates crash points, manages phases, runs countdown
  - Writes state to localStorage every 50ms: `aviator_game_state`, `aviator_crash_history`, `aviator_live_bets`
  - Polls for admin signals: `aviator_manual_crash`, `aviator_settings`
  - Places bot bets (20/round), processes auto-cashouts
  - Game loop never competes with admin

- **`AviatorControlPanel` (Admin Panel)** — Passive sync display
  - Polls localStorage every 100ms to read game state
  - Renders canvas via `requestAnimationFrame` reading localStorage directly (no stale closures)
  - Manual crash → sets `aviator_manual_crash` signal
  - House edge / bias → writes `aviator_settings` signal
  - **Never runs its own game loop** — no round creation, no crash processing
  - Bot bets excluded from all P&L calculations

### localStorage Keys

| Key | Direction | Content |
|-----|-----------|---------|
| `aviator_game_state` | Game → Admin | phase, mult, countdown, crashPoint, startTime |
| `aviator_crash_history` | Game → Admin | Last 30 crash multipliers |
| `aviator_live_bets` | Game → Admin | All bets this round (real + bots) |
| `aviator_manual_crash` | Admin → Game | `{ v: true, ts }` — triggers crash |
| `aviator_settings` | Admin → Game | `{ houseEdge, biasStrength, ts }` |
| `aviator_user_bet_1/2` | Game self | Pending user bet data (refresh persistence) |
| `aviator_my_bets` | Game self | User's bet history (last 15) |

### Game Phases

1. **betting** — countdown timer (8s), users/bots place bets
2. **running** — plane flies, multiplier increases (`e^(0.06*t)`), auto-cashouts process
3. **crashed** — shows crash value, 3s wait, then new round

---

## Features

### Betting
- Dual bet panels (Bet 1 / Bet 2), independent
- Quick bet chips: 6, 10, 20, 50, 100, 200, 500
- Manual amount input with +/- buttons (respects min/max)
- Auto-cashout with presets: 2.00x, 3.00x, 4.00x, 5.00x, 8.00x, 10.00x, 20.00x
- **Min bet:** ₨6 | **Max bet:** ₨1000
- Bet button states: Bet → Cancel (orange) → Cash (yellow) → Result
- Balance validation at every step
- Bot bets (20/round) with random amounts and auto-cashout targets

### Visual
- Dark navy theme (`#0c1220`) with neon green (`#00e887`) and red (`#ff4d4d`) accents
- Canvas-rendered game: grid, curved neon trail, plane image, multiplier overlay
- Crash explosion particles
- Crash history pills: blue (<2x), purple (2-10x), red (>10x)
- Live bets feed with color-coded status
- Cashout exit popups (floating "+₨X" animations)
- **Admin panel canvas** — identical rendering to game canvas, reads from localStorage

### Persistence
- Game state survives page refresh
- User bets with auto-cashout settings persist through refresh
- Crash history persists (last 30 values)
- Personal bet history (last 15)

---

## Multiplier Display System

- **Actual plane multiplier:** `e^(0.06 * elapsed_seconds)`
- **Display multiplier:** `actual_mult * 1.5`
- **Auto-cashout presets:** stored in display-space (e.g., "4.00x")
- **Auto-cashout trigger:** converts to actual by dividing by 1.5, compares against plane mult
- **Win amount:** `bet_amount * display_target`

---

## API (`frontend/src/api/aviator.js`)

### Supabase DB Functions
- `generateCrashPoint(houseEdge)` — provably fair crash point
- `generateBotBetAmount(min, max)` — random bot bet
- `generateBotAutoCashout()` — random bot auto-cashout target
- `getRandomBotName()` — random bot username
- `getRecentCrashes(limit)` — fetch from `game_rounds`
- `getUserBetHistory(userId, limit)` — fetch from `game_bets`
- `placeBet(...)` — insert into `game_bets`
- `cashoutBet(dbBetId, multiplier)` — update bet
- `getGameSettings()` — read from `game_settings` table (DB)

### localStorage Signal Functions
- `setManualCrash()` — write `aviator_manual_crash` signal
- `getManualCrash()` — read crash signal (clears if >30s old)
- `clearManualCrash()` — remove signal
- `setGameSettings(settings)` — write `aviator_settings` (houseEdge, biasStrength)
- `getGameSettingsLocal()` — read settings from localStorage

### Database Tables
- `game_rounds` — round_id, server_seed, crash_point, status, house_profit, ...
- `game_bets` — id, round_id, user_id, username, amount, auto_cashout_at, status, ...
- `game_settings` — min_bet, max_bet, house_edge, ...

---

## Component Hierarchy

```
AviatorGame.jsx
├── LoadingScreen
├── BetPanel x2 (Bet 1, Bet 2)
└── Canvas + Overlay (countdown/crash multiplier)

GamesPage.jsx → AviatorControlPanel
├── Canvas (RAF, reads localStorage directly) — col-span-2
├── Controls + Session P&L — col-span-1
├── House Edge P&L Dashboard — FULL WIDTH ROW
├── Smart HE Controls — col-span-1 | All Bets Table — col-span-1
└── Footer note
```

### Admin Panel Layout (3-row grid)
1. **Row 1:** Canvas (wide) + Controls card
2. **Row 2:** House Edge P&L Dashboard (full width, 6-column stats grid)
3. **Row 3:** Smart HE Controls (left) + All Bets Table (right)

### Admin Panel Settings Persistence
- Settings (heMode, heTargetPct, heMinSecs, heMaxSecs, etc.) load from `aviator_settings` localStorage on mount
- Admin must press "Save to Game Engine" to persist settings for the game engine to use
- Settings are restored on every admin panel load
- HE Pool query polls DB every 3 seconds via `refetchInterval: 3000`

---

## Key Implementation Decisions

1. **`motion` must stay in imports** — removing it causes `ReferenceError`
2. **Nested function components cause Babel parse errors** — all components are top-level
3. **React Strict Mode double-mount** — fixed with module-level `_engineRunning` singleton guard
4. **Engine effect depends on `[showLoading]`** — only starts after loading completes, guarded by both `showLoading` and `_engineRunning`
5. **Display multiplier = `mult * 1.5`** — house edge multiplier on all displays
6. **Auto cashout uses display-space presets** — converted to actual by dividing by 1.5
7. **Admin canvas reads localStorage directly** — `requestAnimationFrame` reads state without going through React state, preventing stale closures
8. **Admin panel is passive** — no game loop, no round creation, no DB writes
9. **`isRunningRef` removed** — was causing double-loop issues, replaced with `_engineRunning` module var
10. **Bot bets excluded from P&L** — admin panel filters `is_bot` from all calculations
11. **Settings passed via localStorage** — admin writes to `aviator_settings`, game reads and applies next round
12. **Manual crash via signal** — admin sets `aviator_manual_crash`, game polls and triggers crash on next tick
13. **Admin panel loads saved settings from localStorage** on mount via `useState` initializers reading `localStorage.getItem('aviator_settings')`
14. **HE Pool query has `refetchInterval: 3000`** — auto-refreshes every 3 seconds so data persists across page refreshes
15. **Gross P&L = Deposits + Bets − Winnings − Withdrawals** — tracked per-round via RPC, updated by deposit/withdrawal RPCs

---

## House Edge Pool & P&L Tracking

### Database Table: `aviator_house_edge`
Columns: `total_deposits`, `total_bets`, `total_winnings_paid`, `house_edge_pool`, `total_withdrawals_paid`, `gross_pnl`, `rounds_played`

### P&L Formula
- **Gross P&L** = Total Deposits + Total Bets − Winnings Paid − Withdrawals
- **House Edge Pool** = accumulates 5% of pending (un-cashed) bet amounts per round
- Only real user bets (non-bot) are included in all P&L calculations

### RPC Functions (run `sql/aviator_update.sql` in Supabase SQL Editor)
- `update_aviator_he_pool(p_real_bet, p_real_exit, p_crash_mult)` — called after each round ends
- `record_aviator_deposit(p_amount)` — called when user deposits
- `record_aviator_withdrawal(p_amount)` — called when admin approves withdrawal

### Deposit Flow
- `DepositPage.jsx` → calls `recordDeposit(amount)` after balance update
- `updateBalance()` called to actually credit user balance

### Withdrawal Flow
- `WithdrawPage.jsx` → blocks if `house_edge_pool < 0`
- `admin.js` `approveWithdrawal()` → calls `recordWithdrawal(amount)` before status update

## Files

| File | Purpose |
|------|---------|
| `frontend/src/components/games/AviatorGame.jsx` | Authoritative game engine + UI |
| `frontend/src/api/aviator.js` | DB functions + localStorage signal helpers |
| `frontend/src/components/admin/GamesPage.jsx` | Admin panel (passive sync display) |
| `frontend/src/components/admin/AviatorControlPanel.jsx` | Full admin panel with P&L dashboard |
| `frontend/src/pages/withdraw/WithdrawPage.jsx` | Withdrawal page with HE pool check |
| `frontend/src/pages/deposit/DepositPage.jsx` | Deposit page with HE tracking |
| `frontend/src/api/admin.js` | Admin API with withdrawal deduction |
| `frontend/public/img/aviator_jogo.png` | Plane image |
| `frontend/public/img/aviator_background.jpeg` | Canvas background |
| `frontend/sql/aviator_update.sql` | DB schema + RPC functions |

---

## Environment Variables

```
VITE_SUPABASE_URL=https://rbcipnwwllkscomatqmc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_AhkszCMVXSyaAuk8umFuQ_YPUIJsAL
```
