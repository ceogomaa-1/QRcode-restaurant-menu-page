import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase environment variables')
    _supabase = createClient(url, key)
  }
  return _supabase
}

// Convenience proxy so existing imports work: supabase.from(...) etc.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop]
  },
})

export type Restaurant = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type Dish = {
  id: string
  restaurant_id: string
  name: string
  price: number
  description: string
  glb_url: string
  created_at: string
}
