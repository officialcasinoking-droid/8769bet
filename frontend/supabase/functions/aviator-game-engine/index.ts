/**
 * Aviator Game Engine - Supabase Edge Function
 * Runs continuously to update game state in real-time
 * Called by cron job every 100ms
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Parse request body for admin actions
    let action = null
    let body = {}
    
    try {
      body = await req.json()
      action = body.action
    } catch {}

    // Handle admin actions
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
      }

      return new Response(
        JSON.stringify({ success: true, action: 'force_crash' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get current game state
    const { data: stateData, error: stateError } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()

    if (stateError || !stateData) {
      // Initialize game state if not exists
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
    const now = Date.now()

    // Game logic based on phase
    if (phase === 'betting') {
      const elapsed = (now - startTime) / 1000
      const newCountdown = Math.max(0, BETTING_SECONDS - elapsed)

      if (newCountdown <= 0) {
        // Transition to flying
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
        // Update countdown
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

      // Check for crash
      if (newMultiplier >= crashPoint) {
        // Crash!
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

        return new Response(
          JSON.stringify({ action: 'crashed', crash_point: crashPoint, round_id: roundId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Update multiplier
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
      // Check if we need to start new round (3 seconds after crash)
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