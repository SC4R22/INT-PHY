import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center p-4">
        <div className="bg-theme-card rounded-xl p-8 max-w-lg w-full border-2 border-primary">
          <h2 className="text-2xl font-bold text-theme-primary mb-3">مفيش حساب</h2>
          <p className="text-theme-secondary mb-4">
            حسابك شغال بس ملقيناش بياناتك. اخرج وتواصل مع الدعم لو المشكلة فضلت.
          </p>
          <div className="flex gap-3">
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="btn btn-primary">خروج</button>
            </form>
            <Link href="/login" className="btn btn-secondary">
              رجوع للدخول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch wallet balance for students
  let walletBalance: number | null = null
  if (profile.role === 'student') {
    const { data: wallet } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single()
    walletBalance = wallet ? Number(wallet.balance) : 0
  }

  let enrollments: any[] = []
  let continueWatching: any = null
  let coursesWithProgress: any[] = []
  let expiredEnrollments: any[] = []

  if (profile.role === 'student') {
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select(`*, courses:course_id (id, title, description, deleted_at, thumbnail_url)`)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
    enrollments = enrollmentData || []

    const { data: recentProgress } = await supabase
      .from('user_progress')
      .select(`*, videos:video_id (id, title, duration, module_id, mux_playback_id, modules:module_id (title, course_id, courses:course_id (id, title, thumbnail_url)))`)
      .eq('user_id', user.id)
      .not('last_watched_at', 'is', null)
      .order('last_watched_at', { ascending: false })
      .limit(5)

    // Build a set of active course IDs so we never surface an expired course
    const activeEnrollments = enrollments.filter((e: any) => !e.courses?.deleted_at)
    expiredEnrollments = enrollments.filter((e: any) => !!e.courses?.deleted_at)
    const activeCourseIds = activeEnrollments.map((e: any) => e.courses?.id).filter(Boolean)
    const activeCourseIdSet = new Set(activeCourseIds)

    // Only pick a video whose course is still active
    const incompleteEntry = recentProgress?.find((p: any) => {
      const courseId = (p.videos?.modules as any)?.course_id
      return !p.completed && p.videos && activeCourseIdSet.has(courseId)
    })
    const recentEntry = recentProgress?.find((p: any) => {
      const courseId = (p.videos?.modules as any)?.course_id
      return p.videos && activeCourseIdSet.has(courseId)
    })
    continueWatching = incompleteEntry || recentEntry || null

    if (activeCourseIds.length > 0) {
      const { data: allCourseVideos } = await supabase
        .from('videos')
        .select('id, modules!inner(course_id)')
        .in('modules.course_id', activeCourseIds)

      const { data: allProgress } = await supabase
        .from('user_progress')
        .select('video_id, completed')
        .eq('user_id', user.id)
        .eq('completed', true)

      const completedVideoIds = new Set((allProgress || []).map((p: any) => p.video_id))

      const videosByCourse: Record<string, string[]> = {}
      for (const v of allCourseVideos || []) {
        const courseId = (v.modules as any)?.course_id
        if (!courseId) continue
        if (!videosByCourse[courseId]) videosByCourse[courseId] = []
        videosByCourse[courseId].push(v.id)
      }

      for (const enrollment of activeEnrollments) {
        const courseId = enrollment.courses?.id
        if (!courseId) continue
        const videoIds = videosByCourse[courseId] || []
        const totalVideos = videoIds.length
        const completedVideos = videoIds.filter((id: string) => completedVideoIds.has(id)).length
        const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
        coursesWithProgress.push({ ...enrollment, totalVideos, completedVideos, progressPercent })
      }
    }
  }

  // ── Admin / Teacher view ─────────────────────────────────────────────────────
  if (profile.role === 'teacher' || profile.role === 'admin') {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="bg-theme-card rounded-xl p-5 md:p-8 mb-8 border border-[var(--border-color)]">
            <h2 className="text-3xl font-bold text-theme-primary mb-1">
              أهلاً بيك، {profile.full_name}!
            </h2>
            <p className="text-theme-secondary text-base">
              {profile.role === 'admin' ? 'إدارة المنصة' : 'إدارة كورساتك ومحتواك'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profile.role === 'teacher' && (
              <>
                {[
                  { href: '/admin/courses', label: '📚 كورساتي', desc: 'عرض وإدارة كورساتك' },
                  { href: '/admin/courses/new', label: '➕ كورس جديد', desc: 'إنشاء كورس جديد' },
                  { href: '/admin/codes', label: '🎟️ أكواد الدخول', desc: 'توليد أكواد للطلاب' },
                ].map((item) => (
                  <Link key={item.href} href={item.href}
                    className="bg-theme-card rounded-xl p-6 text-center hover:bg-[var(--bg-card-alt)] transition-all border-2 border-[var(--border-color)] hover:border-primary">
                    <h4 className="text-xl font-bold text-theme-primary mb-2">{item.label}</h4>
                    <p className="text-theme-secondary">{item.desc}</p>
                  </Link>
                ))}
              </>
            )}
            {profile.role === 'admin' && (
              <>
                {[
                  { href: '/admin', label: '⚙️ لوحة التحكم', desc: 'الداشبورد الكامل' },
                  { href: '/admin/courses', label: '📚 إدارة الكورسات', desc: 'إنشاء وتعديل وحذف الكورسات' },
                  { href: '/admin/users', label: '👥 إدارة المستخدمين', desc: 'عرض وإدارة كل المستخدمين' },
                ].map((item) => (
                  <Link key={item.href} href={item.href}
                    className="bg-theme-card rounded-xl p-6 text-center hover:bg-[var(--bg-card-alt)] transition-all border-2 border-[var(--border-color)] hover:border-primary">
                    <h4 className="text-xl font-bold text-theme-primary mb-2">{item.label}</h4>
                    <p className="text-theme-secondary">{item.desc}</p>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Student Dashboard ────────────────────────────────────────────────────────
  const inProgressCourses = coursesWithProgress.filter((e: any) => e.progressPercent < 100)
  const completedCourses  = coursesWithProgress.filter((e: any) => e.progressPercent === 100)

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* ── Continue Watching ── */}
          {continueWatching ? (() => {
            const vid = continueWatching.videos as any
            const mod = vid?.modules as any
            const course = mod?.courses as any
            const dur = vid?.duration || 0
            const pos = continueWatching.last_position || 0
            // When duration is unknown (YouTube videos without stored duration),
            // we can't show a real percentage. Show position in minutes instead.
            const hasDuration = dur > 0
            const watchedPct = hasDuration ? Math.min(100, Math.round((pos / dur) * 100)) : 0
            const remainingPct = 100 - watchedPct

            // Thumbnail comes from the course (set by admin in course edit page)
            // Fallback to Mux auto-thumbnail if course has no thumbnail set
            const thumbUrl: string | null =
              course?.thumbnail_url ||
              (vid?.mux_playback_id
                ? `https://image.mux.com/${vid.mux_playback_id}/thumbnail.jpg?time=${Math.floor(pos)}&width=800`
                : null)

            return (
              <Link href={`/dashboard/watch/${continueWatching.video_id}`}
                className="group relative bg-theme-card rounded-2xl overflow-hidden border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex flex-col">

                {/* Thumbnail area */}
                <div className="relative flex-1 flex items-center justify-center bg-black/80 min-h-[200px]">
                  {thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={vid?.title || 'thumbnail'}
                      className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
                    />
                  )}
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/80 transition-all border-2 border-white/30 backdrop-blur-sm">
                      <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  {/* Top info overlay */}
                  <div className="absolute top-3 left-3 right-3">
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2">
                      <p className="text-primary text-xs font-bold uppercase tracking-wider mb-0.5">
                        {continueWatching.completed ? '↩ آخر مشاهدة' : '▶ كمل المشاهدة'}
                      </p>
                      {course?.title && (
                        <p className="text-white/60 text-xs truncate">{course.title}</p>
                      )}
                      <p className="text-white font-bold text-sm line-clamp-1">{vid?.title}</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar + percentage */}
                <div className="bg-black flex-shrink-0">
                  {hasDuration ? (
                    <>
                      <div className="w-full h-1.5 bg-white/10">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${watchedPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-primary text-xs font-bold">{watchedPct}% مشاهد</span>
                        <span className="text-white/40 text-xs">{remainingPct}% متبقي</span>
                      </div>
                    </>
                  ) : pos > 0 ? (
                    // Duration unknown (YouTube) — show time watched instead
                    <>
                      <div className="w-full h-1.5 bg-white/10">
                        <div className="h-full bg-primary/60" style={{ width: '40%' }} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-primary text-xs font-bold">
                          وصلت لـ {pos >= 3600
                            ? `${Math.floor(pos/3600)}س ${Math.floor((pos%3600)/60)}د`
                            : `${Math.floor(pos/60)}:${String(Math.floor(pos%60)).padStart(2,'0')}`
                          }
                        </span>
                        <span className="text-white/40 text-xs">▶ كمل المشاهدة</span>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-2.5">
                      <p className="text-white/40 text-xs text-center">▶ ابدأ المشاهدة</p>
                    </div>
                  )}
                </div>
              </Link>
            )
          })() : (
            <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] min-h-[280px] flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-theme-primary font-bold mb-1">مفيش فيديوهات جارية</p>
                <p className="text-theme-secondary text-sm">ابدأ المشاهدة عشان تشوف تقدمك هنا</p>
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="bg-theme-card rounded-2xl border-2 border-[var(--border-color)] min-h-[280px] flex flex-col gap-4 p-5">
            <Link href="/courses"
              className="group flex-1 flex items-center justify-between gap-4 rounded-xl border-2 border-primary px-6 py-4 hover:bg-primary/5 transition-all hover:scale-[1.02]">
              <span className="text-xl font-payback font-black text-theme-primary uppercase">
                اشترك في كورس جديد
              </span>
              <svg className="w-14 h-14 text-primary flex-shrink-0" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                <rect x="28" y="60" width="200" height="130" rx="12" />
                <line x1="8" y1="196" x2="248" y2="196" />
                <path d="M96 196 Q128 216 160 196" />
                <polygon points="100,100 100,160 165,130" fill="currentColor" stroke="none" />
                <polygon points="128,38 168,52 128,66 88,52" fill="currentColor" stroke="none" />
                <line x1="168" y1="52" x2="168" y2="72" strokeWidth="10" />
              </svg>
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard/assignments"
                className="group flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary px-4 py-5 hover:bg-primary/5 transition-all hover:scale-[1.02]">
                <svg className="w-10 h-10 text-primary" viewBox="0 0 128 128" fill="currentColor">
                  <path d="M20 10 Q14 10 14 16 L14 112 Q14 118 20 118 L80 118 Q86 118 86 112 L86 36 L60 10 Z" opacity="0.85"/>
                  <path d="M60 10 L60 36 L86 36 Z" opacity="0.6"/>
                  <rect x="26" y="54" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="68" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="82" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="96" width="30" height="6" rx="3" fill="white"/>
                  <rect x="88" y="42" width="26" height="14" rx="7" fill="currentColor"/>
                  <polygon points="110,36 124,49 110,62" fill="currentColor"/>
                </svg>
                <span className="text-sm font-bold text-theme-primary text-center leading-tight">تسليم الواجبات</span>
              </Link>
              <Link href="/dashboard/exams"
                className="group flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary px-4 py-5 hover:bg-primary/5 transition-all hover:scale-[1.02]">
                <svg className="w-10 h-10 text-primary" viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="64" cy="64" r="54"/>
                  <line x1="34" y1="64" x2="88" y2="64"/>
                  <polyline points="68,44 88,64 68,84"/>
                </svg>
                <span className="text-sm font-bold text-theme-primary text-center leading-tight">الامتحانات</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Courses Section ── */}
        <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-primary uppercase italic mb-6">
          كورساتك
        </h2>

        {inProgressCourses.length === 0 && completedCourses.length === 0 ? (
          <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-theme-primary text-2xl font-bold mb-2">مفيش كورسات لحد دلوقتي</p>
            <p className="text-theme-secondary mb-6">اشترك في كورس عشان تبدأ التعلم</p>
            <Link href="/courses" className="btn btn-primary">تصفح الكورسات</Link>
          </div>
        ) : inProgressCourses.length === 0 ? (
          <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-8 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-theme-primary text-xl font-bold mb-1">خلصت كل كورساتك!</p>
            <p className="text-theme-secondary text-sm">شوف الكورسات المكتملة تحت</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {inProgressCourses.map((enrollment: any, index: number) => (
              <div key={enrollment.id}
                className="bg-theme-card rounded-2xl border-2 border-primary overflow-hidden hover:border-primary/80 transition-all hover:scale-[1.02]">
                {enrollment.courses?.thumbnail_url && (
                  <div className="h-36 w-full overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <h3 className="text-2xl font-payback font-black text-theme-primary uppercase leading-tight">
                    {enrollment.courses?.title || `كورس ${index + 1}`}
                  </h3>
                  {enrollment.courses?.description && (
                    <p className="text-theme-secondary text-sm line-clamp-3 leading-relaxed">{enrollment.courses.description}</p>
                  )}
                  <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${enrollment.progressPercent}%` }} />
                  </div>
                  <p className="text-primary text-sm font-bold">{enrollment.progressPercent}% مكتمل</p>
                  <Link href={`/dashboard/courses/${enrollment.courses?.id}`}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold font-payback text-lg hover:bg-primary/80 transition-all uppercase">
                    ادخل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed */}
        {completedCourses.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-4xl md:text-5xl font-payback font-black uppercase italic"
                style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                كورسات مكتملة
              </h2>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-full border border-green-500/30">
                {completedCourses.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {completedCourses.map((enrollment: any) => (
                <div key={enrollment.id}
                  className="bg-theme-card rounded-2xl border-2 border-green-500/40 overflow-hidden hover:border-green-500/70 transition-all hover:scale-[1.02]">
                  {enrollment.courses?.thumbnail_url ? (
                    <div className="h-36 w-full overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-green-500/10 flex items-center justify-center">
                      <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                  )}
                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <h3 className="text-2xl font-payback font-black text-theme-primary uppercase leading-tight">{enrollment.courses?.title}</h3>
                    {enrollment.courses?.description && (
                      <p className="text-theme-secondary text-sm line-clamp-2 leading-relaxed">{enrollment.courses.description}</p>
                    )}
                    <div className="w-full bg-green-500/10 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-500 h-full w-full" />
                    </div>
                    <p className="text-green-400 text-sm font-bold">✓ 100% مكتمل</p>
                    <Link href={`/dashboard/courses/${enrollment.courses?.id}`}
                      className="w-full py-3 bg-green-500/20 text-green-400 rounded-xl font-bold font-payback text-lg hover:bg-green-500/30 transition-all uppercase border border-green-500/30">
                      مراجعة
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired */}
        {expiredEnrollments.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-secondary uppercase italic">كورسات منتهية</h2>
              <span className="px-3 py-1 bg-[var(--bg-card-alt)] text-theme-secondary text-sm font-bold rounded-full border border-[var(--border-color)]">{expiredEnrollments.length}</span>
            </div>
            <p className="text-theme-secondary text-sm mb-6">الكورسات دي مبقتش متاحة. الفيديوهات مقفولة بس الملفات اللي اتنزلتها لسه متاحة.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {expiredEnrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="bg-theme-card rounded-2xl border-2 border-[var(--border-color)] overflow-hidden opacity-75">
                  <div className="bg-[var(--bg-card-alt)] px-4 py-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-theme-secondary uppercase tracking-widest">⛔ تم حذف الكورس</span>
                  </div>
                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <h3 className="text-xl font-payback font-black text-theme-secondary uppercase leading-tight">{enrollment.courses?.title || 'كورس محذوف'}</h3>
                    {enrollment.courses?.description && (
                      <p className="text-theme-muted text-sm line-clamp-2 leading-relaxed">{enrollment.courses.description}</p>
                    )}
                    <div className="w-full bg-[var(--bg-card-alt)] rounded-lg px-4 py-3 flex items-center justify-center gap-2 border border-[var(--border-color)]">
                      <span className="text-lg">🔒</span>
                      <span className="text-theme-secondary text-xs font-semibold">الفيديوهات مقفولة</span>
                    </div>
                    <Link href={`/dashboard/courses/${enrollment.courses?.id}?expired=1`}
                      className="w-full py-3 bg-[var(--bg-card-alt)] text-theme-secondary rounded-xl font-bold font-payback text-sm hover:bg-[var(--border-color)] transition-all uppercase border border-[var(--border-color)]">
                      📁 عرض الملفات
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
