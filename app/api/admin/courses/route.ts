import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdminOrTeacher() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use admin client to bypass RLS for the role check
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'teacher'].includes(profile.role)) return null
  return user
}

// POST /api/admin/courses — create a new course
export async function POST(req: NextRequest) {
  const user = await verifyAdminOrTeacher()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, price_cash, is_free, published } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .insert({
      title: title.trim(),
      description: description.trim(),
      price_cash: is_free ? 0 : parseFloat(price_cash) || 0,
      is_free: !!is_free,
      published: !!published,
      teacher_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ course: data })
}
