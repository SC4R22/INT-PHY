import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ expired?: string }>
}) {
  const { id } = await params
  const { expired } = await searchParams
  const isExpiredView = expired === '1'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrollment } = await supabase
    .from('enrollments').select('id').eq('user_id', user.id).eq('course_id', id).single()
  if (!enrollment) redirect(`/courses/${id}`)

  const { data: course, error } = await supabase
    .from('courses').select('*').eq('id', id).single()
  if (error || !course) notFound()

  if (course.deleted_at && !isExpiredView) redirect(`/dashboard/courses/${id}?expired=1`)

  // Fetch modules + videos (include module_type)
  const { data: modules } = await supabase
    .from('modules')
    .select(`id, title, order_index, module_type, videos (id, title, duration, order_index)`)
    .eq('course_id', id)
    .order('order_index')

  const moduleIds = (modules ?? []).map((m: any) => m.id)

  // Files
  let filesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: filesData } = await supabase
      .from('module_files').select('*').in('module_id', moduleIds).order('order_index')
    for (const f of filesData ?? []) {
      if (!filesMap[f.module_id]) filesMap[f.module_id] = []
      filesMap[f.module_id].push(f)
    }
  }

  // Quizzes (lesson modules only)
  let quizzesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: quizzesData } = await supabase
      .from('quizzes').select('id, title, order_index').in('module_id', moduleIds).order('order_index')
    for (const q of quizzesData ?? []) {
      if (!quizzesMap[q.module_id]) quizzesMap[q.module_id] = []
      quizzesMap[q.module_id].push(q)
    }
  }

  // Exams (exam modules)
  let examsMap: Record<string, any> = {}
  if (moduleIds.length > 0) {
    const { data: examsData } = await supabase
      .from('module_exams').select('id, title, module_id').in('module_id', moduleIds)
    for (const e of examsData ?? []) examsMap[e.module_id] = e
  }

  // Quiz submissions for this user
  const allQuizIds = Object.values(quizzesMap).flat().map((q: any) => q.id)
  let quizSubmissionsMap: Record<string, any> = {}
  if (allQuizIds.length > 0) {
    const { data: subs } = await supabase
      .from('quiz_submissions').select('quiz_id, score, total').eq('user_id', user.id).in('quiz_id', allQuizIds)
    for (const s of subs ?? []) quizSubmissionsMap[s.quiz_id] = s
  }

  // Exam submissions for this user
  const allExamIds = Object.values(examsMap).map((e: any) => e.id)
  let examSubmissionsMap: Record<string, any> = {}
  if (allExamIds.length > 0) {
    const { data: subs } = await supabase
      .from('module_exam_submissions').select('exam_id, score, total').eq('user_id', user.id).in('exam_id', allExamIds)
    for (const s of subs ?? []) examSubmissionsMap[s.exam_id] = s
  }

  // Video progress
  const allVideoIds = modules?.flatMap((m) => (m as any).videos?.map((v: any) => v.id) ?? []) ?? []
  const { data: progressRows } = await supabase
    .from('user_progress').select('video_id, completed, last_position').eq('user_id', user.id).in('video_id', allVideoIds)
  const progressMap = new Map((progressRows ?? []).map((p) => [p.video_id, p]))

  const totalVideos = allVideoIds.length
  const completedCount = (progressRows ?? []).filter((p) => p.completed).length
  const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0

  // ── EXPIRED VIEW ─────────────────────────────────────────────────────────────
  if (isExpiredView || course.deleted_at) {
    return (
      <div className="min-h-screen bg-[#25292D]">
        <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link href="/dashboard" className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold">← Dashboard</Link>
            <span className="text-[#3A3A3A]">/</span>
            <span className="text-[#B3B3B3] font-bold text-sm truncate">{course.title}</span>
            <span className="ml-2 px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-400 text-xs font-bold rounded-full uppercase">Expired</span>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8 bg-red-900/20 border-2 border-red-700/40 rounded-2xl p-6 flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">⛔</span>
            <div>
              <h2 className="text-[#EFEFEF] font-bold text-lg mb-1">This course has been removed</h2>
              <p className="text-[#B3B3B3] text-sm">The admin has deleted this course. You can no longer access content.</p>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-payback font-bold text-[#B3B3B3] uppercase italic mb-2 line-through decoration-red-600/60">{course.title}</h1>
        </div>
      </div>
    )
  }

  // ── NORMAL VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#25292D]">
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold">← Dashboard</Link>
          <span className="text-[#3A3A3A]">/</span>
          <span className="text-[#EFEFEF] font-bold text-sm truncate">{course.title}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10">
        {/* Title + progress */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-payback font-bold text-[#EFEFEF] uppercase italic mb-4">{course.title}</h1>
          {totalVideos > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-[#1a1a1a] rounded-full h-3 overflow-hidden">
                <div className="bg-primary h-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-primary font-bold text-sm whitespace-nowrap">{completedCount}/{totalVideos} videos · {progressPercent}%</span>
            </div>
          )}
        </div>

        {/* Modules */}
        {!modules || modules.length === 0 ? (
          <div className="text-center py-20 bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A]">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-[#B3B3B3] text-lg">No content yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(modules as any[]).map((mod, modIndex) => {
              const isExamModule = mod.module_type === 'exam'
              const sortedVideos = [...(mod.videos ?? [])].sort(
                (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
              )
              const modCompleted = sortedVideos.filter((v: any) => progressMap.get(v.id)?.completed).length
              const moduleQuizzes: any[] = quizzesMap[mod.id] ?? []
              const moduleExam = examsMap[mod.id] ?? null

              return (
                <div
                  key={mod.id}
                  className={`bg-[#2A2A2A] rounded-xl overflow-hidden border-2 ${isExamModule ? 'border-yellow-600/40' : 'border-[#3A3A3A]'}`}
                >
                  {/* Module header */}
                  <div className={`flex items-center justify-between px-4 md:px-6 py-4 gap-2 ${isExamModule ? 'bg-yellow-900/20' : 'bg-[#3A3A3A]'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isExamModule ? 'bg-yellow-600' : 'bg-primary'}`}>
                        {modIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-[#EFEFEF] font-bold truncate">{mod.title}</h2>
                          {isExamModule && (
                            <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/40">EXAM</span>
                          )}
                        </div>
                        {!isExamModule && (
                          <p className="text-[#B3B3B3] text-xs">{modCompleted}/{sortedVideos.length} videos done</p>
                        )}
                      </div>
                    </div>
                    {!isExamModule && moduleQuizzes.length > 0 && (
                      <span className="text-yellow-400 text-xs font-semibold flex-shrink-0 whitespace-nowrap">{moduleQuizzes.length} quiz{moduleQuizzes.length > 1 ? 'zes' : ''}</span>
                    )}
                  </div>

                  {/* ── EXAM MODULE ── */}
                  {isExamModule && moduleExam && (() => {
                    const sub = examSubmissionsMap[moduleExam.id]
                    return (
                      <Link
                        href={`/dashboard/exam/${moduleExam.id}`}
                        className="flex items-center justify-between px-4 md:px-6 py-5 hover:bg-yellow-500/5 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xl ${sub ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-yellow-600/20 border-yellow-600 text-yellow-400'}`}>
                            {sub ? '✓' : '📋'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#EFEFEF] font-bold text-base group-hover:text-yellow-400 transition-colors">{moduleExam.title}</p>
                            {sub ? (
                              <p className="text-green-400 text-sm font-semibold">Score: {sub.score}/{sub.total} ({Math.round((sub.score/sub.total)*100)}%)</p>
                            ) : (
                              <p className="text-[#B3B3B3] text-sm">Click to take this exam</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 ml-4 transition-colors ${sub ? 'text-green-400' : 'text-yellow-400 opacity-0 group-hover:opacity-100'}`}>
                          {sub ? 'View Results' : '→ Start'}
                        </span>
                      </Link>
                    )
                  })()}

                  {/* ── LESSON MODULE ── */}
                  {!isExamModule && (<>
                    {/* Files */}
                    {(filesMap[mod.id] ?? []).length > 0 && (
                      <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                        {(filesMap[mod.id] ?? []).map((file: any) => (
                          <a key={file.id} href={file.file_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-orange-500/5 transition-colors group">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-500/20 border-2 border-orange-500/40 text-orange-400 text-sm">
                                {file.file_type?.includes('pdf') ? '📕' : '📄'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[#EFEFEF] text-sm font-semibold truncate group-hover:text-orange-400 transition-colors">{file.name}</p>
                                <p className="text-xs text-[#555]">{file.file_type?.includes('pdf') ? 'PDF' : 'File'}{file.file_size ? ` · ${(file.file_size/(1024*1024)).toFixed(1)} MB` : ''}</p>
                              </div>
                            </div>
                            <span className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold flex-shrink-0 ml-4">⬇ Download</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Quizzes */}
                    {moduleQuizzes.length > 0 && (
                      <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                        {moduleQuizzes.map((quiz: any) => {
                          const sub = quizSubmissionsMap[quiz.id]
                          return (
                            <Link key={quiz.id} href={`/dashboard/quiz/${quiz.id}`}
                              className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-yellow-500/5 transition-colors group">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-sm font-bold ${sub ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-yellow-600/20 border-yellow-600 text-yellow-400'}`}>
                                  {sub ? '✓' : '📝'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[#EFEFEF] text-sm font-semibold truncate group-hover:text-yellow-400 transition-colors">{quiz.title}</p>
                                  {sub ? (
                                    <p className="text-green-400 text-xs">Score: {sub.score}/{sub.total} · {Math.round((sub.score/sub.total)*100)}%</p>
                                  ) : (
                                    <p className="text-yellow-500/70 text-xs">Quiz · Click to take</p>
                                  )}
                                </div>
                              </div>
                              <span className={`text-xs font-bold flex-shrink-0 ml-4 transition-all ${sub ? 'text-green-400' : 'text-yellow-400 opacity-0 group-hover:opacity-100'}`}>
                                {sub ? 'Retake' : '→ Start'}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}

                    {/* Videos */}
                    {sortedVideos.length > 0 && (
                      <div className="divide-y divide-[#3A3A3A]">
                        {sortedVideos.map((video: any, vidIndex: number) => {
                          const progress = progressMap.get(video.id)
                          const isCompleted = progress?.completed ?? false
                          const lastPos = progress?.last_position ?? 0
                          const watchPercent = video.duration && video.duration > 0
                            ? Math.round((lastPos / video.duration) * 100) : 0
                          return (
                            <Link key={video.id} href={`/dashboard/watch/${video.id}`}
                              className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-[#3A3A3A] transition-colors group gap-2">
                              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-[#555] group-hover:border-primary text-[#555]'}`}>
                                  {isCompleted ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[#EFEFEF] text-sm font-semibold truncate group-hover:text-primary transition-colors">{vidIndex + 1}. {video.title}</p>
                                  {!isCompleted && lastPos > 0 && <p className="text-xs text-primary mt-0.5">{watchPercent}% watched</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                {video.duration && <span className="text-[#B3B3B3] text-xs">{Math.floor(video.duration/60)}m {video.duration%60}s</span>}
                                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">▶ Watch</span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}

                    {sortedVideos.length === 0 && moduleQuizzes.length === 0 && (filesMap[mod.id] ?? []).length === 0 && (
                      <p className="px-6 py-4 text-[#555] text-sm italic">No content in this module yet.</p>
                    )}
                  </>)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
