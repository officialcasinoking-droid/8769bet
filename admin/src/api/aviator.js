import { supabase } from '../lib/supabase'

export async function getHouseEdgePool() {
  try {
    const { data, error } = await supabase
      .from('aviator_house_edge')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    return data || {}
  } catch (err) {
    console.error('Error fetching HE pool:', err)
    return {}
  }
}

export async function getAviatorSettings() {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 1)
      .single()
    
    if (error) throw error
    return data || {}
  } catch (err) {
    console.error('Error fetching settings:', err)
    return {}
  }
}

export async function saveAviatorSettings(settings) {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .upsert({ id: 1, ...settings })
      .select()
    
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('Error saving settings:', err)
    return { success: false, error: err.message }
  }
}
