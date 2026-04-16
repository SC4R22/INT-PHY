import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' || profile?.role === 'teacher' ? user : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const admin = createAdminClient()

  const { data: course, error: courseErr } = await admin
    .from('courses').select('*').eq('id', courseId).single()
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })

  const { data: modulesData, error: modulesErr } = await admin
    .from('modules').select('*, videos(*)').eq('course_id', courseId).order('order_index')
  if (modulesErr) return NextResponse.json({ error: modulesErr.message }, { status: 500 })

  const moduleIds = (modulesData ?? []).map((m: any) => m.id)

  // Fetch chapters for all videos in this course
  const allVideoIds = (modulesData ?? []).flatMap((m: any) => (m.videos ?? []).map((v: any) => v.id))
  let chaptersMap: Record<string, any[]> = {}
  if (allVideoIds.length > 0) {
    const { data: chaptersData } = await admin
      .from('video_chapters').select('*').in('video_id', allVideoIds).order('order_index')
    for (const c of chaptersData ?? []) {
      if (!chaptersMap[c.video_id]) chaptersMap[c.video_id] = []
      chaptersMap[c.video_id].push(c)
    }
  }

  let filesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: filesData } = await admin
      .from('module_files').select('*').in('module_id', moduleIds).order('order_index')
    for (const f of filesData ?? []) {
      if (!filesMap[f.module_id]) filesMap[f.module_id] = []
      filesMap[f.module_id].push(f)
    }
  }

  let quizzesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: quizzesData } = await admin
      .from('quizzes').select('*, quiz_questions(*)').in('module_id', moduleIds).order('order_index')
    for (const q of quizzesData ?? []) {
      if (!quizzesMap[q.module_id]) quizzesMap[q.module_id] = []
      quizzesMap[q.module_id].push({
        ...q,
        quiz_questions: [...(q.quiz_questions ?? [])].sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      })
    }
  }

  let examsMap: Record<string, any> = {}
  if (moduleIds.length > 0) {
    const { data: examsData } = await admin
      .from('module_exams').select('*, exam_question_items(*)').in('module_id', moduleIds)
    for (const e of examsData ?? []) {
      examsMap[e.module_id] = {
        ...e,
        exam_question_items: [...(e.exam_question_items ?? [])].sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      }
    }
  }

  const modules = (modulesData ?? []).map((mod: any) => ({
    ...mod,
    videos: [...(mod.videos ?? [])].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    ).map((v: any) => ({ ...v, chapters: chaptersMap[v.id] ?? [] })),
    files: filesMap[mod.id] ?? [],
    quizzes: quizzesMap[mod.id] ?? [],
    exam: examsMap[mod.id] ?? null,
  }))

  return NextResponse.json({ course, modules })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'addModule') {
    const { title, orderIndex, moduleType = 'lesson' } = body
    const { data: mod, error } = await admin.from('modules').insert({
      course_id: courseId, title, order_index: orderIndex, module_type: moduleType,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (moduleType === 'exam' || moduleType === 'homework') {
      const { error: examErr } = await admin.from('module_exams').insert({ module_id: mod.id, title })
      if (examErr) return NextResponse.json({ error: examErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteModule') {
    const { moduleId } = body
    const { error } = await admin.from('modules').delete().eq('id', moduleId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'addVideo') {
    const { moduleId, title, orderIndex, videoUrl, duration, muxAssetId, muxPlaybackId, thumbnailUrl } = body
    const payload: any = { module_id: moduleId, title, order_index: orderIndex }
    if (videoUrl) { payload.video_url = videoUrl; payload.duration = duration ?? null }
    if (muxAssetId) { payload.mux_asset_id = muxAssetId; payload.mux_playback_id = muxPlaybackId; payload.duration = duration ?? null }
    if (thumbnailUrl?.trim()) payload.thumbnail_url = thumbnailUrl.trim()
    const { error } = await admin.from('videos').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteVideo') {
    const { videoId } = body
    const { error } = await admin.from('videos').delete().eq('id', videoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Chapter actions ──────────────────────────────────────────────────────────
  if (action === 'addChapter') {
    const { videoId, title, startTime, orderIndex } = body
    const { error } = await admin.from('video_chapters').insert({
      video_id: videoId,
      title: title.trim(),
      start_time: Math.max(0, parseInt(startTime) || 0),
      order_index: orderIndex,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'updateChapter') {
    const { chapterId, title, startTime } = body
    const { error } = await admin.from('video_chapters').update({
      title: title.trim(),
      start_time: Math.max(0, parseInt(startTime) || 0),
    }).eq('id', chapterId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteChapter') {
    const { chapterId } = body
    const { error } = await admin.from('video_chapters').delete().eq('id', chapterId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'addFile') {
    const { moduleId, name, fileUrl, fileSize, fileType, orderIndex } = body
    const { error } = await admin.from('module_files').insert({
      module_id: moduleId, name, file_url: fileUrl,
      file_size: fileSize, file_type: fileType, order_index: orderIndex,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteFile') {
    const { fileId } = body
    const { error } = await admin.from('module_files').delete().eq('id', fileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'addQuiz') {
    const { moduleId, title, orderIndex, questions } = body
    const { data: quiz, error: quizErr } = await admin.from('quizzes').insert({
      module_id: moduleId, title, order_index: orderIndex,
    }).select().single()
    if (quizErr) return NextResponse.json({ error: quizErr.message }, { status: 500 })

    if (questions?.length) {
      const rows = questions.map((q: any, i: number) => ({
        quiz_id: quiz.id,
        order_index: i,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct: q.correct,
        solution: q.solution?.trim() || null,
      }))
      const { error: qErr } = await admin.from('quiz_questions').insert(rows)
      if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteQuiz') {
    const { quizId } = body
    const { error } = await admin.from('quizzes').delete().eq('id', quizId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'updateQuizQuestion') {
    const { questionId, questionText, correct, optionA, optionB, optionC, optionD, solution } = body
    const patch: any = {
      question_text: questionText,
      correct,
      option_a: optionA || null,
      option_b: optionB || null,
      option_c: optionC || null,
      option_d: optionD || null,
      solution: solution?.trim() || null,
    }
    const { error } = await admin.from('quiz_questions').update(patch).eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'addExamQuestion') {
    const { examId, imageUrl, questionText, correct, orderIndex, optionA, optionB, optionC, optionD, solution } = body
    const payload: any = { exam_id: examId, correct, order_index: orderIndex }
    if (imageUrl) payload.image_url = imageUrl
    if (questionText) payload.question_text = questionText
    if (optionA) payload.option_a = optionA
    if (optionB) payload.option_b = optionB
    if (optionC) payload.option_c = optionC
    if (optionD) payload.option_d = optionD
    payload.solution = solution?.trim() || null
    const { error } = await admin.from('exam_question_items').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'updateExamQuestion') {
    const { questionId, questionText, correct, optionA, optionB, optionC, optionD, solution } = body
    const patch: any = { correct }
    if (questionText !== undefined) patch.question_text = questionText
    if (optionA !== undefined) patch.option_a = optionA || null
    if (optionB !== undefined) patch.option_b = optionB || null
    if (optionC !== undefined) patch.option_c = optionC || null
    if (optionD !== undefined) patch.option_d = optionD || null
    patch.solution = solution?.trim() || null
    const { error } = await admin.from('exam_question_items').update(patch).eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'deleteExamQuestion') {
    const { questionId } = body
    const { error } = await admin.from('exam_question_items').delete().eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
