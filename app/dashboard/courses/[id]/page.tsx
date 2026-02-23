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

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', id)
    .single()

  if (!enrollment) redirect(`/courses/${id}`)

  // Fetch course — allow deleted ones so the expired view still loads
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !course) notFound()

  // If the course is deleted and user didn't come via the expired link, redirect them to the expired view
  if (course.deleted_at && !isExpiredView) {
    redirect(`/dashboard/courses/${id}?expired=1`)
  }

  // Fetch modules + videos
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      videos (id, title, duration, order_index)
    `)
    .eq('course_id', id)
    .order('order_index')

  // Fetch files for each module
  const moduleIds = (modules ?? []).map((m: any) => m.id)
  let filesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: filesData } = await supabase
      .from('module_files')
      .select('*')
      .in('module_id', moduleIds)
      .order('order_index')
    if (filesData) {
      for (const f of filesData) {
        if (!filesMap[f.module_id]) filesMap[f.module_id] = []
        filesMap[f.module_id].push(f)
      }
    }
  }

  // Fetch user progress for this course's videos
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

  const totalVideos = allVideoIds.length
  const completedCount = (progressRows ?? []).filter((p) => p.completed).length
  const progressPercent =
    totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0

  // ── EXPIRED VIEW ────────────────────────────────────────────────────────────
  if (isExpiredView || course.deleted_at) {
    return (
      <div className="min-h-screen bg-[#25292D]">
        <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold"
            >
              ← Dashboard
            </Link>
            <span className="text-[#3A3A3A]">/</span>
            <span className="text-[#B3B3B3] font-bold text-sm truncate">{course.title}</span>
            <span className="ml-2 px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-400 text-xs font-bold rounded-full uppercase tracking-wider">
              Expired
            </span>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Expired banner */}
          <div className="mb-8 bg-red-900/20 border-2 border-red-700/40 rounded-2xl p-6 flex items-start gap-4">
            <span className="text-4xl flex-shrink-0">⛔</span>
            <div>
              <h2 className="text-[#EFEFEF] font-bold text-lg mb-1">This course has been removed</h2>
              <p className="text-[#B3B3B3] text-sm">
                The admin has deleted this course. You can no longer watch videos, but any downloadable files attached to this course are still available below.
              </p>
            </div>
          </div>

          {/* Course title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-payback font-bold text-[#B3B3B3] uppercase italic mb-2 line-through decoration-red-600/60">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-[#555] text-sm mt-2">{course.description}</p>
            )}
          </div>

          {/* Locked modules — show structure but no links */}
          {modules && modules.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#B3B3B3] uppercase tracking-wider mb-4">
                🔒 Course Content (locked)
              </h3>
              {modules.map((mod: any, modIndex: number) => {
                const sortedVideos = [...(mod.videos ?? [])].sort(
                  (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
                )
                return (
                  <div
                    key={mod.id}
                    className="bg-[#1e2125] rounded-xl overflow-hidden border-2 border-[#2A2A2A] opacity-60"
                  >
                    {/* Module header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-[#2A2A2A]">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[#3A3A3A] rounded-full flex items-center justify-center text-[#555] font-bold text-sm flex-shrink-0">
                          {modIndex + 1}
                        </span>
                        <h2 className="text-[#B3B3B3] font-bold">{mod.title}</h2>
                      </div>
                      <span className="text-[#555] text-sm">{sortedVideos.length} videos</span>
                    </div>

                    {/* Videos — shown as locked, not clickable */}
                    {sortedVideos.length > 0 && (
                      <div className="divide-y divide-[#2A2A2A]">
                        {sortedVideos.map((video: any, vidIndex: number) => (
                          <div
                            key={video.id}
                            className="flex items-center justify-between px-6 py-3 cursor-not-allowed"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#3A3A3A] text-[#3A3A3A]">
                                🔒
                              </div>
                              <p className="text-[#555] text-sm truncate">
                                {vidIndex + 1}. {video.title}
                              </p>
                            </div>
                            {video.duration && (
                              <span className="text-[#3A3A3A] text-xs ml-4">
                                {Math.floor(video.duration / 60)}m {video.duration % 60}s
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Files section — placeholder for when files are added */}
          <div className="mt-10">
            <h3 className="text-lg font-bold text-[#B3B3B3] uppercase tracking-wider mb-4">
              📁 Downloadable Files
            </h3>
            <div className="bg-[#1e2125] rounded-xl border-2 border-dashed border-[#3A3A3A] p-10 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-[#B3B3B3] font-semibold mb-1">No files available</p>
              <p className="text-[#555] text-sm">This course had no downloadable files attached.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── NORMAL (ACTIVE) VIEW ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#25292D]">
      {/* Header */}
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold"
          >
            ← Dashboard
          </Link>
          <span className="text-[#3A3A3A]">/</span>
          <span className="text-[#EFEFEF] font-bold text-sm truncate">{course.title}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10">
        {/* Course title + progress */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-payback font-bold text-[#EFEFEF] uppercase italic mb-4">
            {course.title}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#1a1a1a] rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-primary font-bold text-sm whitespace-nowrap">
              {completedCount}/{totalVideos} videos · {progressPercent}%
            </span>
          </div>
        </div>

        {/* Modules */}
        {!modules || modules.length === 0 ? (
          <div className="text-center py-20 bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A]">
            <p className="text-5xl mb-3">📋</p>
            <p className="text-[#B3B3B3] text-lg">No content yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod: any, modIndex: number) => {
              const sortedVideos = [...(mod.videos ?? [])].sort(
                (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
              )
              const modCompleted = sortedVideos.filter((v: any) =>
                progressMap.get(v.id)?.completed
              ).length

              return (
                <div
                  key={mod.id}
                  className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-[#3A3A3A]"
                >
                  {/* Module header */}
                  <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-[#3A3A3A] gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {modIndex + 1}
                      </span>
                      <h2 className="text-[#EFEFEF] font-bold truncate">{mod.title}</h2>
                    </div>
                    <span className="text-[#B3B3B3] text-sm flex-shrink-0 whitespace-nowrap">
                      {modCompleted}/{sortedVideos.length} done
                    </span>
                  </div>

                  {/* Files for this module */}
                  {(filesMap[mod.id] ?? []).length > 0 && (
                    <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                      {(filesMap[mod.id] ?? []).map((file: any) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-6 py-3 hover:bg-orange-500/5 transition-colors group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-500/20 border-2 border-orange-500/40 text-orange-400 text-sm">
                              {file.file_type?.includes('pdf') ? '📕' : file.file_type?.includes('word') ? '📝' : '📄'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#EFEFEF] text-sm font-semibold truncate group-hover:text-orange-400 transition-colors">
                                {file.name}
                              </p>
                              <p className="text-xs text-[#555] mt-0.5">
                                {file.file_type?.includes('pdf') ? 'PDF Document' : file.file_type?.includes('word') ? 'Word Document' : 'File'}
                                {file.file_size ? ` · ${(file.file_size / (1024 * 1024)).toFixed(1)} MB` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold flex-shrink-0 ml-4">
                            ⬇ Download
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {sortedVideos.length > 0 && (
                    <div className="divide-y divide-[#3A3A3A]">
                      {sortedVideos.map((video: any, vidIndex: number) => {
                        const progress = progressMap.get(video.id)
                        const isCompleted = progress?.completed ?? false
                        const lastPos = progress?.last_position ?? 0
                        const watchPercent =
                          video.duration && video.duration > 0
                            ? Math.round((lastPos / video.duration) * 100)
                            : 0

                        return (
                          <Link
                            key={video.id}
                            href={`/dashboard/watch/${video.id}`}
                            className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-[#3A3A3A] transition-colors group gap-2"
                          >
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              {/* Completion indicator */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                  isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-[#555] group-hover:border-primary text-[#555]'
                                }`}
                              >
                                {isCompleted ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[#EFEFEF] text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                  {vidIndex + 1}. {video.title}
                                </p>
                                {!isCompleted && lastPos > 0 && (
                                  <p className="text-xs text-primary mt-0.5">{watchPercent}% watched</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              {video.duration && (
                                <span className="text-[#B3B3B3] text-xs">
                                  {Math.floor(video.duration / 60)}m {video.duration % 60}s
                                </span>
                              )}
                              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">
                                ▶ Watch
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
