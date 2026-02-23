import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { VideoPlayer } from './video-player'

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>
}) {
  const { videoId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch video with module + course
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

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

    if (!enrollment) redirect(`/courses/${courseId}`)

  // If course is deleted, redirect to the expired view — videos are not accessible
  const { data: courseCheck } = await supabase
    .from('courses')
    .select('deleted_at')
    .eq('id', courseId)
    .single()

  if (courseCheck?.deleted_at) {
    redirect(`/dashboard/courses/${courseId}?expired=1`)
  }

  // Get all videos in this course for the sidebar
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      videos (id, title, duration, order_index)
    `)
    .eq('course_id', courseId)
    .order('order_index')

  // Get user progress for this course
  const allVideoIds =
    modules?.flatMap((m) => m.videos?.map((v: any) => v.id) ?? []) ?? []

  const { data: progressRows } = await supabase
    .from('user_progress')
    .select('video_id, completed, last_position')
    .eq('user_id', user.id)
    .in('video_id', allVideoIds)

  const progressMap = new Map(
    (progressRows ?? []).map((p) => [p.video_id, p])
  )

  // Get current video progress
  const currentProgress = progressMap.get(videoId)

  return (
    <div className="min-h-screen bg-[#25292D] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A] flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold whitespace-nowrap"
          >
            ← <span className="hidden sm:inline">{course?.title ?? 'Course'}</span><span className="sm:hidden">Back</span>
          </Link>
          <span className="text-[#3A3A3A]">/</span>
          <span className="text-[#EFEFEF] font-bold text-sm truncate">{video.title}</span>
        </div>
      </header>

      {/* Main layout: player + sidebar */}
      <div className="flex flex-1 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Video player area */}
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
            progressMap={Object.fromEntries(progressMap)}
          />
        </div>

        {/* Sidebar: course curriculum */}
        <aside className="w-80 bg-[#1e2125] border-l-2 border-[#3A3A3A] overflow-y-auto hidden lg:block flex-shrink-0">
          <div className="p-4 border-b border-[#3A3A3A]">
            <h2 className="text-[#EFEFEF] font-bold text-sm uppercase tracking-wider">
              Course Content
            </h2>
          </div>

          <div className="divide-y divide-[#3A3A3A]">
            {(modules ?? []).map((mod: any, modIndex: number) => {
              const sortedVideos = [...(mod.videos ?? [])].sort(
                (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
              )

              return (
                <div key={mod.id}>
                  {/* Module label */}
                  <div className="px-4 py-3 bg-[#25292D]">
                    <p className="text-[#B3B3B3] text-xs font-bold uppercase tracking-wider">
                      {modIndex + 1}. {mod.title}
                    </p>
                  </div>

                  {/* Videos */}
                  {sortedVideos.map((v: any, vIdx: number) => {
                    const prog = progressMap.get(v.id)
                    const isActive = v.id === videoId
                    const isDone = prog?.completed ?? false

                    return (
                      <Link
                        key={v.id}
                        href={`/dashboard/watch/${v.id}`}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          isActive
                            ? 'bg-primary/20 border-l-4 border-primary'
                            : 'hover:bg-[#2A2A2A] border-l-4 border-transparent'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                            isDone
                              ? 'bg-green-500 border-green-500 text-white'
                              : isActive
                              ? 'border-primary text-primary'
                              : 'border-[#555] text-[#555]'
                          }`}
                        >
                          {isDone ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isActive ? 'text-primary' : isDone ? 'text-[#B3B3B3]' : 'text-[#EFEFEF]'
                            }`}
                          >
                            {vIdx + 1}. {v.title}
                          </p>
                          {v.duration && (
                            <p className="text-[10px] text-[#555] mt-0.5">
                              {Math.floor(v.duration / 60)}m {v.duration % 60}s
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
