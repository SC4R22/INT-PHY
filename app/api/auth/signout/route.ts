import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

async function handleSignOut(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}

// Also handle GET so <Link href="/api/auth/signout"> and direct navigation works
export async function GET(request: NextRequest) {
  return handleSignOut(request)
}
