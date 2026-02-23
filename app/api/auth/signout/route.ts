import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}

// GET is intentionally not supported — sign-out must be a POST to prevent
// CSRF logout attacks via <img src="/api/auth/signout"> on malicious pages.
export async function GET() {
  return new Response('Method Not Allowed — use POST to sign out', { status: 405 })
}
