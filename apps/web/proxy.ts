import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withChaos } from '@/lib/utils/chaosMiddleware'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Apply chaos middleware first
  supabaseResponse = withChaos(request, supabaseResponse)

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
          // Re-apply chaos headers to the new response object just in case
          supabaseResponse = withChaos(request, supabaseResponse)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/owner') ||
    request.nextUrl.pathname.startsWith('/book') ||
    request.nextUrl.pathname.startsWith('/admin')

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user) {
    const role = user.user_metadata?.role || 'CUSTOMER'

    // Prevent non-owners/admins from accessing owner routes
    if (request.nextUrl.pathname.startsWith('/owner') && role !== 'OWNER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Prevent non-admins from accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isAuthRoute || request.nextUrl.pathname === '/') {
      if (role === 'OWNER') {
        return NextResponse.redirect(new URL('/owner', request.url))
      }
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // If they are a CUSTOMER hitting an auth route, send to home
      if (isAuthRoute) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
