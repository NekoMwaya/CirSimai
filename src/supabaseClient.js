import { createClient } from '@supabase/supabase-js'

// Credentials are stored in .env.local and never committed to git
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)