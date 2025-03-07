import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createBrowserClient(supabaseUrl!, supabaseKey!, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      // Add CORS settings
      cookieOptions: {
        domain: '.app.github.dev',
        sameSite: 'lax',
        secure: true,
        path: '/'
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'automai@1.0.0'
      }
    }
  })
}