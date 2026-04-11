@echo off
REM ============================================
REM DEPLOY AVIATOR GAME ENGINE TO SUPABASE
REM ============================================

echo.
echo ============================================
echo  DEPLOYING AVIATOR GAME ENGINE
echo ============================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI not found!
    echo.
    echo Installing Supabase CLI...
    echo Run: npm install -g supabase
    echo.
    pause
    exit /b 1
)

echo Step 1: Checking Supabase login...
supabase whoami
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Please login to Supabase...
    supabase login
    echo.
)

echo Step 2: Linking project...
supabase link --project-ref rbcipnwwllkscomatqmc
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link project
    pause
    exit /b 1
)

echo.
echo Step 3: Running database migrations...
supabase db push
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to push database migrations
    pause
    exit /b 1
)

echo.
echo Step 4: Deploying Edge Function...
supabase functions deploy aviator-game-engine --import-map supabase/functions/aviator-game-engine/import_map.json --no-verify-jwt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy Edge Function
    pause
    exit /b 1
)

echo.
echo Step 5: Setting environment variables...
echo.
echo Please set the following secrets in Supabase Dashboard:
echo   - SUPABASE_URL: https://rbcipnwwllkscomatqmc.supabase.co
echo   - SUPABASE_SERVICE_ROLE_KEY: (get from Dashboard ^> Settings ^> API)
echo.
echo Or run:
echo   supabase secrets set SUPABASE_URL=https://rbcipnwwllkscomatqmc.supabase.co
echo   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key-here
echo.

echo Step 6: Verifying deployment...
echo.
curl -X POST https://rbcipnwwllkscomatqmc.supabase.co/functions/v1/aviator-game-engine -H "Content-Type: application/json" -d "{\"action\": \"get_state\"}"
echo.

echo.
echo ============================================
echo  DEPLOYMENT COMPLETE!
echo ============================================
echo.
echo Next steps:
echo 1. Set SUPABASE_SERVICE_ROLE_KEY secret
echo 2. Test the game at http://localhost:5173/games/aviator
echo 3. Check admin panel for game controls
echo 4. Monitor logs in Supabase Dashboard
echo.
pause
