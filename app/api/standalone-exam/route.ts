import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const examId = req.nextUrl.searchParams.get('examId')
  if (!examId) return NextResponse.json({ error: 'Missing examId' }, { status: 400 })

  const admin = createAdminClient()
  const getQuestions = req.nextUrl.searchParams.get('getQuestions') === '1'
  const getCorrect = req.nextUrl.searchParams.get('getCorrect') === '1'

  if (getCorrect) {
    const { data: sub } = await admin
      .from('standalone_exam_submissions')
      .select('exam_id')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .maybeSingle()
    if (!sub) return NextResponse.json({ error: 'No submission found' }, { status: 403 })

    const { data: questions } = await admin
      .from('standalone_exam_questions')
      .select('id, correct, solution')
      .eq('exam_id', examId)

    const correct: Record<string, string> = {}
    const solutions: Record<string, string | null> = {}
    for (const q of questions ?? []) {
      correct[q.id] = q.correct
      solutions[q.id] = q.solution ?? null
    }
    return NextResponse.json({ correct, solutions })
  }

  if (getQuestions) {
    const { data: exam, error: eErr } = await admin
      .from('standalone_exams')
      .select('id, title, description')
      .eq('id', examId)
      .eq('published', true)
      .single()
    if (eErr || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const { data: questions } = await admin
      .from('standalone_exam_questions')
      .select('id, order_index, image_url, question_text, option_a, option_b, option_c, option_d')
      .eq('exam_id', examId)
      .order('order_index')

    return NextResponse.json({ exam, questions: questions ?? [] })
  }

  const { data: sub } = await admin
    .from('standalone_exam_submissions')
    .select('exam_id, score, total, answers')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .maybeSingle()

  return NextResponse.json({ submission: sub })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { examId, answers } = await req.json()
  if (!examId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdminClient()

  const { data: questions, error: qErr } = await admin
    .from('standalone_exam_questions')
    .select('id, correct, solution')
    .eq('exam_id', examId)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const total = questions?.length ?? 0
  let score = 0
  const correct: Record<string, string> = {}
  const solutions: Record<string, string | null> = {}

  for (const q of questions ?? []) {
    correct[q.id] = q.correct
    solutions[q.id] = q.solution ?? null
    if (answers[q.id] === q.correct) score++
  }

  const { error: subErr } = await admin.from('standalone_exam_submissions').upsert({
    user_id: user.id, exam_id: examId, answers, score, total,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,exam_id' })

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  return NextResponse.json({ score, total, correct, solutions })
}
