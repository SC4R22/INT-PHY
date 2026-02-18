import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  await supabase.auth.signOut()

  // Use the request origin instead of a hardcoded env var fallback
  return NextResponse.redirect(new URL('/login', request.url))
}
