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
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname === route)
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
    // Check if user has a profile in the database
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.sub)
      .single()

    // If no profile exists, redirect to complete-profile
    if (!userProfile) {
      const url = request.nextUrl.clone()
      url.pathname = profileCompletionRoute
      return NextResponse.redirect(url)
    }
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
