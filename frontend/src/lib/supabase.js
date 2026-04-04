import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rbcipnwwllkscomatqmc.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AhkszCMVXSyaAuk8xumFuQ_YPUIJsAL'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'sb_secret_mWPpLyPuu2W5_vGraqbVKg_WydTq08u'

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

export const supabaseAnon = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'sb-anon',
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
})

// Admin client with service role key for elevated permissions
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
