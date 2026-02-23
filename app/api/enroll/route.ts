import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { courseId } = await req.json()
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the course exists, is published, not deleted, and is free
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, is_free, published, deleted_at')
    .eq('id', courseId)
    .single()

  if (courseErr || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!course.published || course.deleted_at) {
    return NextResponse.json({ error: 'Course is not available' }, { status: 400 })
  }

  if (!course.is_free) {
    return NextResponse.json({ error: 'This course requires an access code' }, { status: 400 })
  }

  // Check if already enrolled
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (existing) {
    return NextResponse.json({ success: true, alreadyEnrolled: true })
  }

  // Insert using admin client — user identity already verified via auth.getUser()
  const { error: insertErr } = await admin
    .from('enrollments')
    .insert({ user_id: user.id, course_id: courseId })

  if (insertErr) {
    console.error('Enrollment insert error:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
