import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rbcipnwwllkscomatqmc.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AhkszCMVXSyaAuk8xumFuQ_YPUIJsAL'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'sb_secret_mWPpLyPuu2W5_vGraqbVKg_WydTq08u'

// Single shared Supabase client - all modules should import this instance
// to avoid the "Multiple GoTrueClient instances" warning
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
})

// Admin client with service role key for elevated permissions (server-side use only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
})

// Deprecated backward-compatibility alias.
// supabaseAnon has been removed to fix the "Multiple GoTrueClient instances"
// warning. Use `supabase` instead. This alias prevents import errors.
export const supabaseAnon = supabase
