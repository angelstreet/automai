import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if we're on a protected route
  const isProtectedRoute = 
    request.nextUrl.pathname.includes('/dashboard') ||
    request.nextUrl.pathname.includes('/settings') ||
    request.nextUrl.pathname.includes('/profile') ||
    request.nextUrl.pathname.includes('/admin') ||
    request.nextUrl.pathname.includes('/hosts') ||
    request.nextUrl.pathname.includes('/development') ||
    request.nextUrl.pathname.includes('/deployment') ||
    request.nextUrl.pathname.includes('/repositories') ||
    request.nextUrl.pathname.includes('/terminals') ||
    request.nextUrl.pathname.includes('/reports') ||
    request.nextUrl.pathname.includes('/scripts') ||
    request.nextUrl.pathname.includes('/team') ||
    request.nextUrl.pathname.includes('/tests') ||
    request.nextUrl.pathname.includes('/billing');

  if (!user && isProtectedRoute) {
    // Extract locale from URL
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const locale = pathParts[0] || 'en';
    
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

