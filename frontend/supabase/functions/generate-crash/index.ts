// Aviator Crash Point Generator - Edge Function
// Uses provably fair algorithm

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GameSettings {
  house_edge: number
  max_crash: number
}

function sha256(message: string): string {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = crypto.subtle.digest('SHA-256', msgBuffer)
  return hashBuffer.then(buffer => {
    const hashArray = Array.from(new Uint8Array(buffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

function calculateCrashPoint(serverSeed: string, clientSeed: string, houseEdge: number): number {
  const combinedSeed = serverSeed + clientSeed
  
  // Generate hash
  const hashBuffer = new TextEncoder().encode(combinedSeed)
  
  // Use SubtleCrypto for consistent hash
  return crypto.subtle.digest('SHA-256', hashBuffer).then(hash => {
    const hashArray = new Uint8Array(hash)
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Take first 13 hex characters
    const h = parseInt(hashHex.slice(0, 13), 16)
    
    // E = 2^52
    const e = Math.pow(2, 52)
    
    // Calculate crash point with house edge
    // Higher house_edge = more crashes (lower multipliers)
    // house_edge of 0.04 means ~4% house edge
    const houseMultiplier = 1 - houseEdge
    
    // Calculate crash point
    let crashPoint = Math.floor((100 * e - h) / (e - h)) / 100
    
    // Apply house edge (slightly lower the crash point)
    crashPoint = crashPoint * houseMultiplier
    
    // Ensure minimum of 1.00
    crashPoint = Math.max(1.00, crashPoint)
    
    return crashPoint
  })
}

function generateRandomSeed(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get game settings
    const { data: settings, error: settingsError } = await supabase
      .from('game_settings')
      .select('house_edge, max_crash')
      .eq('id', 'aviator')
      .single()

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Failed to get game settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gameSettings: GameSettings = {
      house_edge: settings.house_edge || 0.04,
      max_crash: settings.max_crash || 50.0
    }

    // Generate server seed
    const serverSeed = generateRandomSeed()
    
    // Generate client seed (could be from user in future)
    const clientSeed = generateRandomSeed()
    
    // Hash the server seed (to reveal later)
    const serverSeedHash = await sha256(serverSeed)
    
    // Generate round ID
    const roundId = `avi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Calculate crash point
    const crashPoint = await calculateCrashPoint(serverSeed, clientSeed, gameSettings.house_edge)

    // Insert new round
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        round_id: roundId,
        server_seed_hash: serverSeedHash,
        server_seed: serverSeed,
        client_seed: clientSeed,
        crash_point: crashPoint,
        status: 'waiting',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (roundError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create round' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return round info (without the actual crash point - it's hidden until crash)
    return new Response(
      JSON.stringify({
        success: true,
        round_id: round.round_id,
        server_seed_hash: round.server_seed_hash,
        crash_point_hidden: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating crash:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
