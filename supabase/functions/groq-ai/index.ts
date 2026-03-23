import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    let prompt, game_type
    try {
      const body = await req.json()
      prompt = body.prompt
      game_type = body.game_type
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!prompt) {
      return jsonResponse({ error: 'Prompt is required' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('groq_api_key')
      .eq('id', 'main')
      .single()

    if (settingsError || !settings?.groq_api_key) {
      return jsonResponse({ error: 'Groq API key not configured. Please add it in Settings.' }, 400)
    }

    const groqApiKey = settings.groq_api_key

    const systemPrompt = game_type === 'crash'
      ? `You are an AI betting assistant for a crash game (like Aviator/JetX). The game multiplier starts at 1.0x and increases rapidly, then crashes randomly between 1.0x and potentially 10000x+.

Your task: Analyze patterns and suggest optimal cashout points.

Provide a prediction with:
1. suggested_cashout: A multiplier value (e.g. 2.5)
2. confidence: A percentage (0-100) representing how confident you are
3. risk_level: "low", "medium", or "high"
4. reasoning: Brief explanation of why (2-3 sentences)

Return ONLY valid JSON in this exact format:
{"suggested_cashout": 2.5, "confidence": 87, "risk_level": "medium", "reasoning": "Based on recent crash patterns, the average crash point is trending around 2.3x. Historical data shows 78% of crashes occur above 2.0x."}`
      : `You are an AI betting assistant for slot games. Provide advice on bet sizing and game selection.

Return ONLY valid JSON:
{"recommended_bet_percent": 1, "confidence": 75, "game_tip": "Sweet Bonanza", "reasoning": "Brief tip text."}`

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!groqResponse.ok) {
      const errText = await groqResponse.text()
      return jsonResponse({ error: `Groq API error: ${errText}` }, 502)
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content?.trim() || '{}'

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      parsed = { raw: content }
    }

    return jsonResponse({
      success: true,
      prediction: parsed,
      model: MODEL,
    })

  } catch (err) {
    return jsonResponse({ error: err.message }, 500)
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}
