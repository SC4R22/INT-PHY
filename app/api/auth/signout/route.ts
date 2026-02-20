import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Basic CSRF guard: require the request to originate from the same site
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        return new Response('Forbidden', { status: 403 })
      }
    } catch {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/login', request.url))
}
