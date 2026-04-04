/**
 * Aviator Game Engine - Supabase Edge Function
 * Runs continuously to update game state in real-time
 * Called by cron job every 1 second
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BETTING_SECONDS = 8

function generateCrashPoint(houseEdge = 5) {
  const r = Math.random()
  const e = Math.max(0, Math.min(houseEdge, 20))
  
  const p1 = 0.40 - e * 2
  const p2 = 0.25 - e
  const p3 = 0.15
  const p4 = 0.12

  if (r < p1) return 1.00 + Math.random() * 0.50
  if (r < p1 + p2) return 1.50 + Math.random() * 1.00
  if (r < p1 + p2 + p3) return 2.50 + Math.random() * 2.00
  if (r < p1 + p2 + p3 + p4) return 4.50 + Math.random() * 5.50
  return 10.00 + Math.random() * 40.00
}

function getRandomBotBets(roundId: string) {
  const bots = [
    { name: 'Ali_Khan', amount: Math.floor(Math.random() * 500) + 50 },
    { name: 'Sara_Ahmed', amount: Math.floor(Math.random() * 1000) + 100 },
    { name: 'Usman_Ali', amount: Math.floor(Math.random() * 300) + 20 },
    { name: 'Fatima_Zahid', amount: Math.floor(Math.random() * 800) + 50 },
    { name: 'Ahmed_Raza', amount: Math.floor(Math.random() * 600) + 100 },
    { name: 'Ayesha_Khan', amount: Math.floor(Math.random() * 400) + 50 },
    { name: 'Bilal_Hassan', amount: Math.floor(Math.random() * 700) + 100 },
    { name: 'Zainab_Malik', amount: Math.floor(Math.random() * 500) + 50 },
    { name: 'Hassan_Ali', amount: Math.floor(Math.random() * 900) + 100 },
    { name: 'Mariam_Waseem', amount: Math.floor(Math.random() * 350) + 50 },
  ]
  
  const numBots = Math.floor(Math.random() * 5) + 3
  const selected = bots.sort(() => Math.random() - 0.5).slice(0, numBots)
  
  return selected.map(bot => ({
    round_id: roundId,
    username: bot.name,
    amount: bot.amount,
    is_bot: true
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    let action = null
    let body: Record<string, unknown> = {}
    
    try {
      body = await req.json()
      action = body.action as string
    } catch {}

    // Action: Place a bet
    if (action === 'place_bet') {
      const { round_id, user_id, username, amount } = body
      
      if (!round_id || !username || !amount) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: state } = await supabase
        .from('aviator_game_state')
        .select('phase')
        .eq('id', 'current')
        .single()

      if (!state || state.phase !== 'betting') {
        return new Response(
          JSON.stringify({ success: false, error: 'Betting closed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: bet, error: betError } = await supabase
        .from('aviator_bets')
        .insert({
          round_id,
          user_id: user_id || null,
          username,
          amount,
          is_bot: false,
          status: 'pending'
        })
        .select()
        .single()

      if (betError) {
        return new Response(
          JSON.stringify({ success: false, error: betError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update house pool
      await supabase
        .from('aviator_house_pool')
        .update({
          total_bets: supabase.raw('total_bets + ?', [amount]),
          last_updated: new Date().toISOString()
        })
        .eq('id', 'pool')

      return new Response(
        JSON.stringify({ success: true, bet_id: bet.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: Cashout
    if (action === 'cashout') {
      const { bet_id, multiplier } = body
      
      const { data: bet, error: betError } = await supabase
        .from('aviator_bets')
        .select('*')
        .eq('id', bet_id)
        .single()

      if (betError || !bet) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bet not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (bet.status !== 'pending') {
        return new Response(
          JSON.stringify({ success: false, error: 'Already processed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const winAmount = parseFloat(bet.amount as string) * (multiplier as number)
      const profit = parseFloat(bet.amount as string) - winAmount

      await supabase
        .from('aviator_bets')
        .update({
          status: 'cashed_out',
          multiplier,
          cashout_amount: winAmount,
          cashout_multiplier: multiplier
        })
        .eq('id', bet_id)

      await supabase
        .from('aviator_house_pool')
        .update({
          total_winnings: supabase.raw('total_winnings + ?', [winAmount]),
          house_profit: supabase.raw('house_profit + ?', [profit]),
          last_updated: new Date().toISOString()
        })
        .eq('id', 'pool')

      return new Response(
        JSON.stringify({ success: true, win_amount: winAmount, profit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: Force crash
    if (action === 'force_crash') {
      const { data: currentState } = await supabase
        .from('aviator_game_state')
        .select('*')
        .eq('id', 'current')
        .single()

      if (currentState && currentState.phase === 'flying') {
        await supabase
          .from('aviator_game_state')
          .update({
            phase: 'crashed',
            multiplier: currentState.multiplier,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current')

        await supabase
          .from('aviator_crash_history')
          .insert({
            round_id: currentState.round_id,
            crash_point: currentState.multiplier
          })

        // Mark all pending bets as lost
        await supabase
          .from('aviator_bets')
          .update({ status: 'lost' })
          .eq('round_id', currentState.round_id)
          .eq('status', 'pending')

        // Get pending bet total and update house pool
        const { data: pendingBets } = await supabase
          .from('aviator_bets')
          .select('amount')
          .eq('round_id', currentState.round_id)
          .eq('status', 'lost')

        const pendingTotal = pendingBets?.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) || 0

        if (pendingTotal > 0) {
          await supabase
            .from('aviator_house_pool')
            .update({
              house_profit: supabase.raw('house_profit + ?', [pendingTotal]),
              rounds_played: supabase.raw('rounds_played + 1'),
              last_updated: new Date().toISOString()
            })
            .eq('id', 'pool')
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: 'force_crash' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: New round
    if (action === 'new_round') {
      const newRoundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const { data: settings } = await supabase
        .from('aviator_settings')
        .select('house_edge, wait_time_seconds')
        .eq('id', 'config')
        .single()

      const waitTime = settings?.wait_time_seconds || BETTING_SECONDS
      const houseEdge = settings?.house_edge || 5

      await supabase
        .from('aviator_game_state')
        .update({
          phase: 'betting',
          multiplier: 1.00,
          countdown: waitTime,
          crash_point: generateCrashPoint(houseEdge),
          round_id: newRoundId,
          start_time: Date.now(),
          flight_start_time: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'current')

      return new Response(
        JSON.stringify({ success: true, action: 'new_round', round_id: newRoundId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: Get house stats
    if (action === 'house_stats') {
      const { data: stats } = await supabase
        .from('aviator_house_pool')
        .select('*')
        .eq('id', 'pool')
        .single()

      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current game state
    const { data: stateData, error: stateError } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()

    if (stateError || !stateData) {
      const newRoundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await supabase
        .from('aviator_game_state')
        .upsert({
          id: 'current',
          phase: 'betting',
          multiplier: 1.00,
          countdown: BETTING_SECONDS,
          crash_point: generateCrashPoint(5),
          round_id: newRoundId,
          start_time: Date.now(),
          flight_start_time: null
        })

      return new Response(
        JSON.stringify({ action: 'initialized', phase: 'betting' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phase = stateData.phase
    const startTime = parseInt(stateData.start_time)
    const flightStartTime = stateData.flight_start_time ? parseInt(stateData.flight_start_time) : null
    const crashPoint = parseFloat(stateData.crash_point)
    const roundId = stateData.round_id
    const countdown = parseFloat(stateData.countdown)
    const now = Date.now()

    // Game logic based on phase
    if (phase === 'betting') {
      const elapsed = (now - startTime) / 1000
      let newCountdown = Math.max(0, countdown - elapsed)

      // Add bot bets during betting phase (first 3 seconds)
      if (elapsed < 3 && Math.random() < 0.3) {
        const botBets = getRandomBotBets(roundId)
        for (const botBet of botBets) {
          await supabase.from('aviator_bets').insert(botBet)
        }
      }

      if (newCountdown <= 0) {
        await supabase
          .from('aviator_game_state')
          .update({
            phase: 'flying',
            multiplier: 1.00,
            flight_start_time: now,
            start_time: now,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current')

        return new Response(
          JSON.stringify({ action: 'started_flying', phase: 'flying', multiplier: 1.00 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        await supabase
          .from('aviator_game_state')
          .update({ countdown: newCountdown, updated_at: new Date().toISOString() })
          .eq('id', 'current')

        return new Response(
          JSON.stringify({ action: 'countdown', countdown: newCountdown }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } 
    else if (phase === 'flying') {
      if (!flightStartTime) {
        return new Response(
          JSON.stringify({ error: 'Flight start time not set' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const elapsed = (now - flightStartTime) / 1000
      const newMultiplier = Math.pow(Math.E, 0.06 * elapsed)

      if (newMultiplier >= crashPoint) {
        await supabase
          .from('aviator_game_state')
          .update({
            phase: 'crashed',
            multiplier: crashPoint,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current')

        await supabase
          .from('aviator_crash_history')
          .insert({ round_id: roundId, crash_point: crashPoint })

        // Mark all pending bets as lost
        await supabase
          .from('aviator_bets')
          .update({ status: 'lost' })
          .eq('round_id', roundId)
          .eq('status', 'pending')

        // Update house pool with lost bets
        const { data: pendingBets } = await supabase
          .from('aviator_bets')
          .select('amount')
          .eq('round_id', roundId)
          .eq('status', 'lost')

        const pendingTotal = pendingBets?.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) || 0

        if (pendingTotal > 0) {
          await supabase
            .from('aviator_house_pool')
            .update({
              house_profit: supabase.raw('house_profit + ?', [pendingTotal]),
              rounds_played: supabase.raw('rounds_played + 1'),
              last_updated: new Date().toISOString()
            })
            .eq('id', 'pool')
        }

        // Keep only last 30 crash points
        await supabase
          .from('aviator_crash_history')
          .delete()
          .not('id', 'in', 
            supabase.from('aviator_crash_history').select('id').order('created_at').limit(30)
          )

        return new Response(
          JSON.stringify({ action: 'crashed', crash_point: crashPoint, round_id: roundId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        await supabase
          .from('aviator_game_state')
          .update({
            multiplier: Math.round(newMultiplier * 100) / 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current')

        return new Response(
          JSON.stringify({ action: 'flying', multiplier: Math.round(newMultiplier * 100) / 100 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    else if (phase === 'crashed') {
      const timeSinceCrash = now - startTime
      if (timeSinceCrash > 3000) {
        const newRoundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const { data: settings } = await supabase
          .from('aviator_settings')
          .select('house_edge')
          .eq('id', 'config')
          .single()
        
        const houseEdge = settings?.house_edge || 5
        
        await supabase
          .from('aviator_game_state')
          .update({
            phase: 'betting',
            multiplier: 1.00,
            countdown: BETTING_SECONDS,
            crash_point: generateCrashPoint(houseEdge),
            round_id: newRoundId,
            start_time: now,
            flight_start_time: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current')

        return new Response(
          JSON.stringify({ action: 'new_round', phase: 'betting', round_id: newRoundId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ action: 'waiting', phase: 'crashed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ action: 'noop', phase }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Game engine error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
