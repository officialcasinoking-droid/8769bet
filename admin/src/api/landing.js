import { supabase } from '../lib/supabase'
export { supabase }

export async function getLanding() {
  try {
    const { data, error } = await supabase
      .from('landing_content')
      .select('live_json')
      .eq('id', 'main')
      .single()
    if (error || !data) return null
    return data.live_json || {}
  } catch {
    return null
  }
}

export async function getDraft() {
  const { data, error } = await supabase
    .from('landing_content')
    .select('draft_json')
    .eq('id', 'main')
    .single()
  if (error) return null
  return data?.draft_json || {}
}

export async function saveDraft(draftJson) {
  const { data, error } = await supabase
    .from('landing_content')
    .update({ draft_json: draftJson, updated_at: new Date().toISOString() })
    .eq('id', 'main')
    .select()
    .single()
  if (error) throw error
  return data
}

export async function publishContent(content) {
  const { data, error } = await supabase
    .from('landing_content')
    .update({
      live_json: content,
      draft_json: content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'main')
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getJackpotTiers() {
  const { data, error } = await supabase
    .from('jackpot_tiers')
    .select('*')
    .eq('is_active', true)
    .order('seed_amount')
  if (error) return []
  return data || []
}
