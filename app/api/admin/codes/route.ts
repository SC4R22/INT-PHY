import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [coursesRes, codesRes] = await Promise.all([
    admin
      .from('courses')
      .select('id, title')
      .is('deleted_at', null)
      .order('title'),
    admin
      .from('access_codes')
      .select(`
        id, code, course_id, is_used, created_at, expires_at,
        course:course_id (title),
        used_by_profile:used_by (full_name, phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return NextResponse.json({
    courses: coursesRes.data || [],
    codes: codesRes.data || [],
  })
}
