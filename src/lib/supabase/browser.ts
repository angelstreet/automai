import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Get hostname without port
  const baseHostname = window.location.hostname.replace(/:\d+$/, '')

  return createBrowserClient(supabaseUrl!, supabaseKey!, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      cookieOptions: {
        domain: baseHostname, // This will work for both ports
        sameSite: 'lax',
        secure: true,
        path: '/'
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'automai@1.0.0'
      },
      // Add fetch options for CORS
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          credentials: 'include',
          mode: 'cors',
          headers: {
            ...options.headers,
            'Origin': window.location.origin,
          }
        })
      }
    }
  })
}