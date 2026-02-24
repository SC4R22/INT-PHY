import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/quiz?quizId=xxx[&getQuestions=1]
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quizId = req.nextUrl.searchParams.get('quizId')
  const getQuestions = req.nextUrl.searchParams.get('getQuestions') === '1'
  if (!quizId) return NextResponse.json({ error: 'Missing quizId' }, { status: 400 })

  const admin = createAdminClient()

  if (getQuestions) {
    // Return quiz info + questions (without correct answers)
    const { data: quiz, error: qErr } = await admin
      .from('quizzes').select('id, title, module_id').eq('id', quizId).single()
    if (qErr || !quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const { data: questions } = await admin
      .from('quiz_questions')
      .select('id, order_index, question_text, option_a, option_b, option_c, option_d')
      .eq('quiz_id', quizId)
      .order('order_index')

    return NextResponse.json({ quiz, questions: questions ?? [] })
  }

  // Return existing submission
  const { data } = await admin
    .from('quiz_submissions')
    .select('quiz_id, score, total, answers')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .maybeSingle()

  return NextResponse.json({ submission: data })
}

// POST /api/quiz — submit a quiz attempt
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quizId, answers } = await req.json()
  if (!quizId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdminClient()

  // Get questions with correct answers
  const { data: questions, error: qErr } = await admin
    .from('quiz_questions').select('id, correct').eq('quiz_id', quizId)
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const total = questions?.length ?? 0
  let score = 0
  const correct: Record<string, string> = {}
  for (const q of questions ?? []) {
    correct[q.id] = q.correct
    if (answers[q.id] === q.correct) score++
  }

  const { error: subErr } = await admin.from('quiz_submissions').upsert({
    user_id: user.id, quiz_id: quizId, answers, score, total,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'user_id,quiz_id' })

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  // Return score + correct answers so frontend can highlight them
  return NextResponse.json({ score, total, correct })
}
