import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase is optional. Without keys, PROOF runs entirely in this browser. */
export const isCloudMode = Boolean(url && anonKey && url.startsWith('http'))

export const supabase: SupabaseClient | null = isCloudMode
  ? createClient(url as string, anonKey as string)
  : null
