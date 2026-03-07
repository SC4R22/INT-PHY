import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    // Only return non-sensitive session info
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      },
    }, { status: 200 })
  } catch {
    return NextResponse.json({ session: null }, { status: 200 })
  }
}
