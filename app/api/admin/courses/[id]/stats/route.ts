import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  const { id: courseId } = await params

  // 1. Course basic info
  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('id, title, description, published, is_free, price_cash, created_at')
    .eq('id', courseId)
    .single()

  if (courseError || !course)
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // 2. All enrollments for this course with user profiles (capped at 2000 for safety)
  const { data: enrollments } = await admin
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      completed,
      progress_percentage,
      user_profiles (
        id,
        full_name,
        phone_number,
        parent_name,
        parent_phone_number
      )
    `)
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false })
    .limit(2000)

  // 3. Full course structure: modules → videos + quizzes + exams
  const { data: modulesRaw } = await admin
    .from('modules')
    .select('id, title, order_index, module_type')
    .eq('course_id', courseId)
    .order('order_index')

  const moduleIds = (modulesRaw || []).map((m: any) => m.id)

  // Videos
  let videosMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: vids } = await admin
      .from('videos')
      .select('id, module_id, title, order_index, duration')
      .in('module_id', moduleIds)
      .order('order_index')
    for (const v of vids || []) {
      if (!videosMap[v.module_id]) videosMap[v.module_id] = []
      videosMap[v.module_id].push(v)
    }
  }

  // Quizzes
  let quizzesMap: Record<string, any[]> = {}
  const { data: quizzesRaw } = await admin
    .from('quizzes')
    .select('id, module_id, title, order_index')
    .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
    .order('order_index')
  for (const q of quizzesRaw || []) {
    if (!quizzesMap[q.module_id]) quizzesMap[q.module_id] = []
    quizzesMap[q.module_id].push(q)
  }

  // Module exams
  let examsMap: Record<string, any> = {}
  const { data: examsRaw } = await admin
    .from('module_exams')
    .select('id, module_id, title')
    .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
  for (const e of examsRaw || []) {
    examsMap[e.module_id] = e
  }

  const modules = (modulesRaw || []).map((mod: any) => ({
    ...mod,
    videos: videosMap[mod.id] || [],
    quizzes: quizzesMap[mod.id] || [],
    exam: examsMap[mod.id] || null,
  }))

  // 4. All flat quiz/exam lists for submissions
  const allQuizzes = (quizzesRaw || [])
  const allExams = Object.values(examsMap)

  const quizIds = allQuizzes.map((q: any) => q.id)
  let quizSubmissions: any[] = []
  if (quizIds.length > 0) {
    const { data } = await admin
      .from('quiz_submissions')
      .select('id, user_id, quiz_id, score, total, submitted_at')
      .in('quiz_id', quizIds)
      .limit(5000)
    quizSubmissions = data || []
  }

  const examIds = allExams.map((e: any) => e.id)
  let examSubmissions: any[] = []
  if (examIds.length > 0) {
    const { data } = await admin
      .from('module_exam_submissions')
      .select('id, user_id, exam_id, score, total, submitted_at')
      .in('exam_id', examIds)
      .limit(5000)
    examSubmissions = data || []
  }

  // 5. User progress (video completions)
  const allVideoIds = Object.values(videosMap).flat().map((v: any) => v.id)
  let userProgress: any[] = []
  if (allVideoIds.length > 0) {
    const { data } = await admin
      .from('user_progress')
      .select('user_id, video_id, completed')
      .in('video_id', allVideoIds)
      .limit(10000)
    userProgress = data || []
  }

  return NextResponse.json({
    course,
    enrollments: enrollments || [],
    modules,
    quizSubmissions,
    examSubmissions,
    userProgress,
  })
}
