import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  return (profile?.role === 'admin' || profile?.role === 'teacher') ? user : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { examId } = await params
  const admin = createAdminClient()

  const { data: exam, error: eErr } = await admin
    .from('standalone_exams').select('*').eq('id', examId).single()
  if (eErr || !exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: questions } = await admin
    .from('standalone_exam_questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index')

  return NextResponse.json({ exam, questions: questions ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { examId } = await params
  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'addQuestion') {
    const { imageUrl, questionText, correct, orderIndex, optionA, optionB, optionC, optionD, solution } = body
    const payload: any = { exam_id: examId, correct, order_index: orderIndex }
    if (imageUrl) payload.image_url = imageUrl
    if (questionText) payload.question_text = questionText
    if (optionA) payload.option_a = optionA
    if (optionB) payload.option_b = optionB
    if (optionC) payload.option_c = optionC
    if (optionD) payload.option_d = optionD
    payload.solution = solution?.trim() || null
    const { error } = await admin.from('standalone_exam_questions').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'updateQuestion') {
    const { questionId, questionText, correct, optionA, optionB, optionC, optionD, solution } = body
    const patch: any = { correct, question_text: questionText || null }
    patch.option_a = optionA || null; patch.option_b = optionB || null
    patch.option_c = optionC || null; patch.option_d = optionD || null
    patch.solution = solution?.trim() || null
    const { error } = await admin.from('standalone_exam_questions').update(patch).eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteQuestion') {
    const { questionId } = body
    const { error } = await admin.from('standalone_exam_questions').delete().eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
