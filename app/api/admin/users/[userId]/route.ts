import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin' && caller?.role !== 'teacher')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { userId } = await params

  // 1. Basic profile
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id, full_name, phone_number, parent_name, parent_phone_number, role, created_at, is_banned, grade, email')
    .eq('id', userId)
    .single()

  if (profileError || !profile)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // 2. Enrolled courses with progress
  const { data: enrollments } = await admin
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      completed,
      progress_percentage,
      courses (
        id,
        title,
        thumbnail_url
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })

  // 3. Quiz submissions
  const { data: quizSubmissions } = await admin
    .from('quiz_submissions')
    .select(`
      id,
      score,
      total,
      submitted_at,
      quizzes (
        id,
        title,
        modules (
          id,
          title,
          courses (
            id,
            title
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })

  // 4. Module exam submissions
  const { data: examSubmissions } = await admin
    .from('module_exam_submissions')
    .select(`
      id,
      score,
      total,
      submitted_at,
      module_exams (
        id,
        title,
        modules (
          id,
          title,
          courses (
            id,
            title
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })

  // 5. Video watch progress
  const { data: videoProgress } = await admin
    .from('user_progress')
    .select(`
      video_id,
      last_position,
      completed,
      last_watched_at,
      videos:video_id (
        id,
        title,
        duration,
        order_index,
        modules:module_id (
          id,
          title,
          courses:course_id (
            id,
            title
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false })

  return NextResponse.json({
    profile,
    enrollments: enrollments || [],
    quizSubmissions: quizSubmissions || [],
    examSubmissions: examSubmissions || [],
    videoProgress: videoProgress || [],
  })
}
