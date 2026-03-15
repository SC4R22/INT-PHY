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

export async function GET() {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: exams } = await admin
    .from('standalone_exams')
    .select('id, title, description, published, created_at')
    .order('created_at', { ascending: false })

  const examIds = (exams ?? []).map((e: any) => e.id)
  const { data: questions } = examIds.length
    ? await admin.from('standalone_exam_questions').select('id, exam_id').in('exam_id', examIds)
    : { data: [] }

  const countByExam: Record<string, number> = {}
  for (const q of questions ?? []) countByExam[q.exam_id] = (countByExam[q.exam_id] || 0) + 1

  const enriched = (exams ?? []).map((e: any) => ({ ...e, questionCount: countByExam[e.id] || 0 }))
  return NextResponse.json({ exams: enriched })
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const { title, description } = body
    const { data, error } = await admin.from('standalone_exams').insert({
      title, description: description || null, created_by: user.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exam: data })
  }

  if (action === 'togglePublish') {
    const { examId, published } = body
    const { error } = await admin.from('standalone_exams').update({ published }).eq('id', examId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { examId } = body
    const { error } = await admin.from('standalone_exams').delete().eq('id', examId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
