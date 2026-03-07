import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                ...options,
                maxAge: 60 * 60 * 24 * 30,
                sameSite: 'lax',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
              })
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl

    if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // On any error, just let the request through — never return 404
    return NextResponse.next({ request })
  }
}
