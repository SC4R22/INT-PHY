import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const courseIds = (enrollments ?? []).map((e: any) => e.course_id)
  if (courseIds.length === 0) return NextResponse.json({ assignments: [] })

  const { data: homeworkModules } = await admin
    .from('modules')
    .select('id, title, course_id, courses:course_id(id, title)')
    .in('course_id', courseIds)
    .eq('module_type', 'homework')
    .order('created_at', { ascending: false })

  if (!homeworkModules || homeworkModules.length === 0) return NextResponse.json({ assignments: [] })

  const moduleIds = homeworkModules.map((m: any) => m.id)

  const { data: exams } = await admin
    .from('module_exams')
    .select('id, title, module_id')
    .in('module_id', moduleIds)

  const examIds = (exams ?? []).map((e: any) => e.id)

  const { data: questions } = examIds.length
    ? await admin.from('exam_question_items').select('id, exam_id').in('exam_id', examIds)
    : { data: [] }

  const questionCountByExam: Record<string, number> = {}
  for (const q of questions ?? []) {
    questionCountByExam[q.exam_id] = (questionCountByExam[q.exam_id] || 0) + 1
  }

  const { data: submissions } = examIds.length
    ? await admin
        .from('module_exam_submissions')
        .select('exam_id, score, total, submitted_at')
        .eq('user_id', user.id)
        .in('exam_id', examIds)
    : { data: [] }

  const submissionByExam: Record<string, any> = {}
  for (const s of submissions ?? []) {
    submissionByExam[s.exam_id] = s
  }

  const examByModule: Record<string, any> = {}
  for (const e of exams ?? []) {
    examByModule[e.module_id] = e
  }

  const assignments = homeworkModules.map((mod: any) => {
    const exam = examByModule[mod.id]
    const submission = exam ? submissionByExam[exam.id] : null
    return {
      moduleId: mod.id,
      moduleTitle: mod.title,
      courseId: (mod.courses as any)?.id,
      courseTitle: (mod.courses as any)?.title,
      examId: exam?.id ?? null,
      questionCount: exam ? (questionCountByExam[exam.id] || 0) : 0,
      submission: submission ?? null,
    }
  })

  return NextResponse.json({ assignments })
}
