import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/sign-up',
  '/sign-up-success',
  '/forgot-password',
  '/update-password',
  '/confirm',
  '/error',
]

// Define auth routes that should redirect to authenticated area if user is already logged in
const authRoutes = [
  '/login',
  '/sign-up',
]

// Route that doesn't require profile completion
const profileCompletionRoute = '/complete-profile'

export async function updateSession(request: NextRequest) {
  // Prepare a response; cookies must be set on the response in Middleware
  let supabaseResponse = NextResponse.next()

  try {
    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // In Middleware, request cookies are read-only. Set cookies on the response only.
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route)
    )
    const isAuthRoute = authRoutes.some((route) => pathname === route)
    const isProfileCompletionRoute = pathname === profileCompletionRoute

    // If user is authenticated and trying to access auth pages, redirect to protected area
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // If user is not authenticated and trying to access protected routes
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Add the original URL as a redirect parameter so we can redirect back after login
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Check if authenticated user has completed their profile
    // Skip check if already on complete-profile page or on public routes
    if (user && !isPublicRoute && !isProfileCompletionRoute) {
      try {
        // Check if user has a profile in the database using the auth user ID directly
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', user.id)
          .maybeSingle()

        // If no profile exists or has no name, redirect to complete-profile
        if (!userProfile || !userProfile.name) {
          const url = request.nextUrl.clone()
          url.pathname = profileCompletionRoute
          return NextResponse.redirect(url)
        }
      } catch (e) {
        // On any profile check failure, allow the request to continue
        console.error('[MIDDLEWARE] Profile check failed:', e)
      }
    }
  } catch (err) {
    // If anything goes wrong in middleware, avoid blocking the request
    console.error('[MIDDLEWARE] updateSession failed:', err)
    return NextResponse.next()
  }

  return supabaseResponse
}
