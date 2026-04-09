import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { VideoPlayer } from './video-player'
import { CollapsibleModuleList } from '@/components/collapsible-module-list'

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>
}) {
  const { videoId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: video, error } = await supabase
    .from('videos')
    .select(`
      id, title, duration, order_index, video_url, mux_playback_id,
      modules:module_id (
        id, title, order_index, course_id,
        courses:course_id (id, title)
      )
    `)
    .eq('id', videoId)
    .single()

  if (error || !video) notFound()

  const mod = video.modules as any
  const course = mod?.courses as any
  const courseId = mod?.course_id

  const [{ data: enrollment }, { data: courseCheck }] = await Promise.all([
    supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', courseId).single(),
    supabase.from('courses').select('deleted_at').eq('id', courseId).single(),
  ])

  if (!enrollment) redirect(`/courses/${courseId}`)
  if (courseCheck?.deleted_at) redirect(`/dashboard/courses/${courseId}?expired=1`)

  const { data: moduleQuizzes } = await supabase
    .from('quizzes').select('id, order_index, title').eq('module_id', mod?.id).order('order_index')

  if (moduleQuizzes && moduleQuizzes.length > 0) {
    const quizIds = moduleQuizzes.map((q: any) => q.id)
    const { data: submissions } = await supabase
      .from('quiz_submissions').select('quiz_id').eq('user_id', user.id).in('quiz_id', quizIds)
    const submittedIds = new Set((submissions ?? []).map((s: any) => s.quiz_id))
    const blockingQuiz = moduleQuizzes.find((q: any) => !submittedIds.has(q.id))
    if (blockingQuiz && (video.order_index ?? 0) >= (blockingQuiz.order_index ?? 0)) {
      redirect(`/dashboard/quiz/${blockingQuiz.id}?locked=1`)
    }
  }

  const [{ data: modules }, { data: currentProgressRow }] = await Promise.all([
    supabase.from('modules')
      .select('id, title, order_index, videos (id, title, duration, order_index)')
      .eq('course_id', courseId).order('order_index'),
    supabase.from('user_progress')
      .select('video_id, completed, last_position')
      .eq('user_id', user.id).eq('video_id', videoId).single(),
  ])

  const allVideoIds = modules?.flatMap((m) => m.videos?.map((v: any) => v.id) ?? []) ?? []
  const { data: progressRows } = await supabase
    .from('user_progress').select('video_id, completed, last_position')
    .eq('user_id', user.id).in('video_id', allVideoIds)

  const progressMap = new Map((progressRows ?? []).map((p) => [p.video_id, p]))

  const sidebarModuleIds = (modules ?? []).map((m: any) => m.id)
  const sidebarLockedVideoIds = new Set<string>()

  if (sidebarModuleIds.length > 0) {
    const { data: allModuleQuizzes } = await supabase
      .from('quizzes').select('id, order_index, module_id')
      .in('module_id', sidebarModuleIds).order('order_index')

    if (allModuleQuizzes && allModuleQuizzes.length > 0) {
      const allQuizIds = allModuleQuizzes.map((q: any) => q.id)
      const { data: allSubs } = await supabase
        .from('quiz_submissions').select('quiz_id').eq('user_id', user.id).in('quiz_id', allQuizIds)
      const submittedSet = new Set((allSubs ?? []).map((s: any) => s.quiz_id))

      const quizzesByModule: Record<string, any[]> = {}
      for (const q of allModuleQuizzes) {
        if (!quizzesByModule[q.module_id]) quizzesByModule[q.module_id] = []
        quizzesByModule[q.module_id].push(q)
      }
      for (const m of (modules ?? []) as any[]) {
        const mQuizzes = quizzesByModule[m.id] ?? []
        const blocking = mQuizzes.find((q: any) => !submittedSet.has(q.id))
        if (!blocking) continue
        for (const v of (m.videos ?? []) as any[]) {
          if ((v.order_index ?? 0) >= (blocking.order_index ?? 0)) sidebarLockedVideoIds.add(v.id)
        }
      }
    }
  }

  const currentProgress = currentProgressRow ?? progressMap.get(videoId)
  const progressObj = Object.fromEntries(progressMap)
  const lockedArr = [...sidebarLockedVideoIds]

  // Build the sidebar JSX here so we can pass it to VideoPlayer for mobile placement
  const sidebarContent = (
    <CollapsibleModuleList
      modules={modules ?? []}
      videoId={videoId}
      progressMap={progressObj}
      lockedIds={lockedArr}
    />
  )

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">

      {/* ── Course title banner ── */}
      <div
        className="flex-shrink-0 px-4 md:px-8 py-4 border-b-2 border-[var(--border-color)]"
        style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}
      >
        <h1 className="text-xl md:text-3xl font-payback font-bold text-white text-right">
          {course?.title}
        </h1>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row flex-1 max-w-[1600px] mx-auto w-full">

        {/* ── Desktop sidebar (LEFT, hidden on mobile — mobile version lives inside VideoPlayer) ── */}
        <aside className="
          hidden lg:flex lg:flex-col
          lg:w-[340px] xl:w-[380px] flex-shrink-0
          border-l-2 border-[var(--border-color)]
          bg-[var(--bg-nav)] lg:overflow-y-auto
        ">
          <div className="px-5 py-4 border-b-2 border-[var(--border-color)] sticky top-0 bg-[var(--bg-nav)] z-10">
            <h2 className="text-theme-primary font-bold text-base text-right">محتوى الكورس</h2>
          </div>
          {sidebarContent}
        </aside>

        {/* ── Player column ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoPlayer
            videoId={videoId}
            videoUrl={video.video_url}
            muxPlaybackId={(video as any).mux_playback_id ?? null}
            videoTitle={video.title}
            courseId={courseId}
            initialPosition={currentProgress?.last_position ?? 0}
            isCompleted={currentProgress?.completed ?? false}
            modules={modules ?? []}
            progressMap={progressObj}
            mobileSidebar={sidebarContent}
          />
        </div>

      </div>
    </div>
  )
}
