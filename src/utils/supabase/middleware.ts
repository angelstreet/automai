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

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extract path parts for analysis
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  const locale = pathParts[0] || 'en';
  
  // Check if we're on a public path
  const isPublicPath = 
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === `/${locale}` ||
    request.nextUrl.pathname === `/${locale}/` ||
    request.nextUrl.pathname.includes('/login') ||
    request.nextUrl.pathname.includes('/signup') ||
    request.nextUrl.pathname.includes('/forgot-password') ||
    request.nextUrl.pathname.includes('/reset-password') ||
    request.nextUrl.pathname.includes('/auth-redirect');

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

  // 1. Handle unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    // Redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // 2. Handle authenticated users on public pages (redirect to dashboard)
  if (user && isPublicPath) {
    // Get tenant from user metadata
    const tenant = user.user_metadata?.tenant_name || 'trial';
    
    // Redirect to tenant dashboard
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/${tenant}/dashboard`
    return NextResponse.redirect(url)
  }

  // 3. Handle authenticated users without tenant in URL
  if (user && pathParts.length < 2) {
    // Get tenant from user metadata
    const tenant = user.user_metadata?.tenant_name || 'trial';
    
    // Redirect to tenant dashboard
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/${tenant}/dashboard`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

