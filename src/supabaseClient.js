import { createClient } from '@supabase/supabase-js'

// Supabase API credentials
const supabaseUrl = 'https://owqfbirlsebjgemccjtr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cWZiaXJsc2ViamdlbWNjanRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDE2NTAsImV4cCI6MjA4NDQ3NzY1MH0.uAiwxkgRpiksZTZYFtbbEv2lgkhxjO_CYWWDduA1PpM'

export const supabase = createClient(supabaseUrl, supabaseKey)