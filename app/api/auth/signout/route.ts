import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(new URL('/login', request.url))
  // Clear any cached pages
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.headers.set('Cache-Control', 'no-store')
  return response
}
