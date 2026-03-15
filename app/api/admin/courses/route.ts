import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdminOrTeacher() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'teacher'].includes(profile.role)) return null
  return user
}

// GET /api/admin/courses — list all courses
export async function GET() {
  const user = await verifyAdminOrTeacher()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: courses, error } = await admin
    .from('courses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ courses })
}

// POST /api/admin/courses — create a new course
export async function POST(req: NextRequest) {
  const user = await verifyAdminOrTeacher()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, price_cash, is_free, published, target_grade } = await req.json()

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
      target_grade: target_grade || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ course: data })
}
