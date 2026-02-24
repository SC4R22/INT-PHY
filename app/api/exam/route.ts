import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/exam?examId=xxx[&getQuestions=1]
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const examId = req.nextUrl.searchParams.get('examId')
  const getQuestions = req.nextUrl.searchParams.get('getQuestions') === '1'
  if (!examId) return NextResponse.json({ error: 'Missing examId' }, { status: 400 })

  const admin = createAdminClient()

  if (getQuestions) {
    // Return exam info + questions (WITHOUT the correct answer)
    const { data: exam, error: eErr } = await admin
      .from('module_exams').select('id, title, module_id').eq('id', examId).single()
    if (eErr || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const { data: questions } = await admin
      .from('exam_question_items')
      .select('id, order_index, image_url')   // deliberately exclude "correct"
      .eq('exam_id', examId)
      .order('order_index')

    return NextResponse.json({ exam, questions: questions ?? [] })
  }

  // Return existing submission only
  const { data } = await admin
    .from('module_exam_submissions')
    .select('exam_id, score, total, answers')
    .eq('user_id', user.id)
    .eq('exam_id', examId)
    .maybeSingle()

  return NextResponse.json({ submission: data })
}

// POST /api/exam — submit an exam attempt
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { examId, answers } = await req.json()
  if (!examId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdminClient()

  // Get correct answers (server-side only)
  const { data: questions, error: qErr } = await admin
    .from('exam_question_items').select('id, correct').eq('exam_id', examId)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const total = questions?.length ?? 0
  let score = 0
  const correct: Record<string, string> = {}
  for (const q of questions ?? []) {
    correct[q.id] = q.correct
    if (answers[q.id] === q.correct) score++
  }

  const { error: subErr } = await admin.from('module_exam_submissions').upsert({
    user_id: user.id, exam_id: examId, answers, score, total,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,exam_id' })

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  // Return score + correct map so frontend can highlight right/wrong answers
  return NextResponse.json({ score, total, correct })
}
