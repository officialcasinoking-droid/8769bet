import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbcipnwwllkscomatqmc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY2lwbnJ3bGxrc2NvbWF0cW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5Mzk4NTksImV4cCI6MjA0OTUxNTg1OX0.Tj9uVHQ4zKqZP4g8qZvYK7Y4gVLqnLyRoa0Y0kQVnZ4'

export const supabase = createClient(supabaseUrl, supabaseKey)
