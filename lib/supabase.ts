import { createClient } from '@supabase/supabase-js'

// Admin Platform Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Main Project Supabase Client (for cross-project data like users)
const mainSupabaseUrl = process.env.NEXT_PUBLIC_MAIN_SUPABASE_URL!
const mainSupabaseAnonKey = process.env.NEXT_PUBLIC_MAIN_SUPABASE_ANON_KEY!

export const mainSupabase = createClient(mainSupabaseUrl, mainSupabaseAnonKey)
