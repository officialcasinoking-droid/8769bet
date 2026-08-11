import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rbcipnwwllkscomatqmc.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY2lwbnd3bGxrc2NvbWF0cW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTg2NTcsImV4cCI6MjA4OTQ5NDY1N30.yVXhIJi86a5s6vH8ySVHcJB4BREuA6IzwDbZGHkElzU'

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

export const supabaseAnon = supabase
