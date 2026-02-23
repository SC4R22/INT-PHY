import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: caller } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, ban } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { error } = await admin
    .from('user_profiles')
    .update({ is_banned: ban })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ban) {
    await admin.auth.admin.updateUserById(userId, { ban_duration: '87600h' })
  } else {
    await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  }

  return NextResponse.json({ success: true })
}
