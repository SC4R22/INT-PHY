import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'

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
      .select(`*, videos:video_id (id, title, duration, module_id, modules:module_id (title, course_id, courses:course_id (id, title)))`)
      .eq('user_id', user.id)
      .order('last_watched_at', { ascending: false })
      .limit(5)

    const incompleteEntry = recentProgress?.find((p: any) => !p.completed && p.videos)
    const recentEntry = recentProgress?.find((p: any) => p.videos)
    continueWatching = incompleteEntry || recentEntry || null

    const activeEnrollments = enrollments.filter((e: any) => !e.courses?.deleted_at)
    expiredEnrollments = enrollments.filter((e: any) => !!e.courses?.deleted_at)

    const activeCourseIds = activeEnrollments.map((e: any) => e.courses?.id).filter(Boolean)

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
        const completedVideos = videoIds.filter(id => completedVideoIds.has(id)).length
        const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0
        coursesWithProgress.push({ ...enrollment, totalVideos, completedVideos, progressPercent })
      }
    }
  }

  // Non-student roles
  if (profile.role === 'teacher' || profile.role === 'admin') {
    return (
      <div className="min-h-screen bg-theme-primary">
        <header className="bg-gradient-to-r from-primary to-primary/80 p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-payback font-bold text-white uppercase italic">
              الداشبورد
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <ThemeToggle />
              {profile.role === 'admin' && (
                <Link href="/admin" className="px-3 py-1.5 md:px-4 md:py-2 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 transition-all text-sm md:text-base">
                  ⚙️ لوحة التحكم
                </Link>
              )}
              <span className="hidden sm:block text-white font-semibold text-sm">{profile.full_name}</span>
              <span className="px-2 py-1 bg-white text-primary rounded-full text-xs font-bold uppercase">
                {profile.role}
              </span>
              <form action="/api/auth/signout" method="post">
                <button className="px-3 py-1.5 md:px-4 md:py-2 bg-white text-primary rounded-lg font-bold hover:bg-gray-100 transition-all text-sm md:text-base">
                  خروج
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="bg-theme-card rounded-xl p-5 md:p-8 mb-8 border border-[var(--border-color)]">
            <h2 className="text-3xl font-bold text-theme-secondary mb-2">
              أهلاً بيك تاني، {profile.full_name}!
            </h2>
            <p className="text-theme-primary text-lg">
              {profile.role === 'admin' && 'إدارة المنصة'}
              {profile.role === 'teacher' && 'إدارة كورساتك ومحتواك'}
            </p>
          </div>

          {profile.role === 'teacher' && (
            <div>
              <h3 className="text-2xl font-bold text-theme-secondary mb-6">أدوات المدرس</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            </div>
          )}

          {profile.role === 'admin' && (
            <div>
              <h3 className="text-2xl font-bold text-theme-secondary mb-6">أدوات الأدمين</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── Student Dashboard ──
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Student Header */}
      <header className="bg-[var(--bg-nav)] border-b-2 border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-primary text-2xl flex-shrink-0 select-none" style={{ fontFamily: '"Rakkas", serif', fontWeight: 400 }}>
            المبدع
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
              الداشبورد
            </Link>
            <Link href="/courses" className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
              تصفح الكورسات
            </Link>
          </nav>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-theme-primary font-semibold text-sm">{profile.full_name}</span>
            </div>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="px-3 py-1.5 text-xs font-bold text-theme-secondary hover:text-theme-primary border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-lg transition-all">
                خروج
              </button>
            </form>
          </div>
        </div>
        <div className="md:hidden border-t border-[var(--border-color)] px-4 py-2 flex gap-2">
          <Link href="/dashboard" className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
            الداشبورد
          </Link>
          <Link href="/courses" className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
            تصفح الكورسات
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* ── Continue Watching (untouched) ── */}
          {continueWatching ? (() => {
            const vid = continueWatching.videos as any
            const mod = vid?.modules as any
            const course = mod?.courses as any
            const dur = vid?.duration || 0
            const pos = continueWatching.last_position || 0
            const watchedPct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0
            const remainingPct = 100 - watchedPct

            return (
              <Link href={`/dashboard/watch/${continueWatching.video_id}`}
                className="group relative bg-theme-card rounded-2xl overflow-hidden border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/80 transition-all border-2 border-white/30">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-14 flex">
                  <div className="bg-primary flex items-center justify-center text-white font-black text-xl font-payback transition-all"
                    style={{ width: `${watchedPct}%`, minWidth: watchedPct > 0 ? '2.5rem' : '0' }}>
                    {watchedPct > 8 ? `${watchedPct}%` : ''}
                  </div>
                  <div className="bg-[var(--bg-card-alt)] flex items-center justify-center text-theme-secondary font-black text-xl font-payback flex-1">
                    {remainingPct < 100 ? `${remainingPct}%` : ''}
                  </div>
                </div>
                <div className="absolute top-4 left-4 right-4 bg-[var(--bg-card-alt)]/90 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-primary text-xs font-bold uppercase tracking-wider mb-0.5">
                    {continueWatching.completed ? '↩ آخر مشاهدة' : '▶ كمل المشاهدة'}
                  </p>
                  {course?.title && (
                    <p className="text-theme-secondary text-xs mb-1 truncate">{course.title}</p>
                  )}
                  <p className="text-theme-primary font-bold text-sm line-clamp-1">{vid?.title}</p>
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

          {/* ── Quick Actions Card (replaces old "Get New Courses") ── */}
          <div className="bg-theme-card rounded-2xl border-2 border-[var(--border-color)] min-h-[280px] flex flex-col gap-4 p-5">

            {/* Top: Get New Courses — full width */}
            <Link href="/courses"
              className="group flex-1 flex items-center justify-between gap-4 rounded-xl border-2 border-primary px-6 py-4 hover:bg-primary/5 transition-all hover:scale-[1.02]">
              <span className="text-xl font-payback font-black text-theme-primary uppercase">
                اشترك في كورس جديد
              </span>
              {/* Laptop / e-learning icon */}
              <svg className="w-14 h-14 text-primary flex-shrink-0" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                {/* Screen */}
                <rect x="28" y="60" width="200" height="130" rx="12" />
                {/* Base */}
                <line x1="8" y1="196" x2="248" y2="196" />
                <path d="M96 196 Q128 216 160 196" />
                {/* Play triangle */}
                <polygon points="100,100 100,160 165,130" fill="currentColor" stroke="none" />
                {/* Grad cap */}
                <polygon points="128,38 168,52 128,66 88,52" fill="currentColor" stroke="none" />
                <line x1="168" y1="52" x2="168" y2="72" strokeWidth="10" />
              </svg>
            </Link>

            {/* Bottom row: two equal buttons */}
            <div className="flex gap-4">

              {/* تسليم الواجبات */}
              <Link href="/dashboard/assignments"
                className="group flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary px-4 py-5 hover:bg-primary/5 transition-all hover:scale-[1.02]">
                {/* Submit-document icon */}
                <svg className="w-10 h-10 text-primary" viewBox="0 0 128 128" fill="currentColor">
                  <path d="M20 10 Q14 10 14 16 L14 112 Q14 118 20 118 L80 118 Q86 118 86 112 L86 36 L60 10 Z" opacity="0.85"/>
                  <path d="M60 10 L60 36 L86 36 Z" opacity="0.6"/>
                  <rect x="26" y="54" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="68" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="82" width="44" height="6" rx="3" fill="white"/>
                  <rect x="26" y="96" width="30" height="6" rx="3" fill="white"/>
                  {/* Arrow pointing right */}
                  <rect x="88" y="42" width="26" height="14" rx="7" fill="currentColor"/>
                  <polygon points="110,36 124,49 110,62" fill="currentColor"/>
                </svg>
                <span className="text-sm font-bold text-theme-primary text-center leading-tight">تسليم الواجبات</span>
              </Link>

              {/* الامتحانات */}
              <Link href="/dashboard/exams"
                className="group flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary px-4 py-5 hover:bg-primary/5 transition-all hover:scale-[1.02]">
                {/* Arrow-in-circle icon */}
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

        {/* Your Courses Section */}
        {(() => {
          const inProgressCourses = coursesWithProgress.filter((e: any) => e.progressPercent < 100)
          const completedCourses = coursesWithProgress.filter((e: any) => e.progressPercent === 100)

          return (
            <>
              <div>
                <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-primary uppercase italic mb-6">
                  كورساتك
                </h2>

                {inProgressCourses.length === 0 && completedCourses.length === 0 ? (
                  <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
                    <p className="text-6xl mb-4">📚</p>
                    <p className="text-theme-primary text-2xl font-bold mb-2">مفيش كورسات لحد دلوقتي</p>
                    <p className="text-theme-secondary mb-6">اشترك في كورس عشان تبدأ التعلم</p>
                    <Link href="/courses" className="btn btn-primary">
                      تصفح الكورسات
                    </Link>
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
                            <Image src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                          </div>
                        )}
                        <div className="p-6 flex flex-col items-center text-center gap-4">
                          <h3 className="text-2xl font-payback font-black text-theme-primary uppercase leading-tight">
                            {enrollment.courses?.title || `كورس ${index + 1}`}
                          </h3>
                          {enrollment.courses?.description && (
                            <p className="text-theme-secondary text-sm line-clamp-3 leading-relaxed">
                              {enrollment.courses.description}
                            </p>
                          )}
                          <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full transition-all" style={{ width: `${enrollment.progressPercent}%` }} />
                          </div>
                          <p className="text-primary text-sm font-bold">
                            {enrollment.progressPercent}% مكتمل
                          </p>
                          <Link href={`/dashboard/courses/${enrollment.courses?.id}`}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold font-payback text-lg hover:bg-primary/80 transition-all uppercase">
                            ادخل
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Courses Section */}
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
                        {enrollment.courses?.thumbnail_url && (
                          <div className="h-36 w-full overflow-hidden relative">
                            <Image src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                        {!enrollment.courses?.thumbnail_url && (
                          <div className="h-24 w-full bg-green-500/10 flex items-center justify-center">
                            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="p-6 flex flex-col items-center text-center gap-3">
                          <h3 className="text-2xl font-payback font-black text-theme-primary uppercase leading-tight">
                            {enrollment.courses?.title}
                          </h3>
                          {enrollment.courses?.description && (
                            <p className="text-theme-secondary text-sm line-clamp-2 leading-relaxed">
                              {enrollment.courses.description}
                            </p>
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
            </>
          )
        })()}

        {/* Expired Courses Section */}
        {expiredEnrollments.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-secondary uppercase italic">
                كورسات منتهية
              </h2>
              <span className="px-3 py-1 bg-[var(--bg-card-alt)] text-theme-secondary text-sm font-bold rounded-full border border-[var(--border-color)]">
                {expiredEnrollments.length}
              </span>
            </div>
            <p className="text-theme-secondary text-sm mb-6">
              الكورسات دي مبقتش متاحة. الفيديوهات مقفولة بس الملفات اللي اتنزلتها لسه متاحة.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {expiredEnrollments.map((enrollment: any) => (
                <div key={enrollment.id}
                  className="bg-theme-card rounded-2xl border-2 border-[var(--border-color)] overflow-hidden opacity-75">
                  <div className="bg-[var(--bg-card-alt)] px-4 py-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-theme-secondary uppercase tracking-widest">⛔ تم حذف الكورس</span>
                  </div>
                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <h3 className="text-xl font-payback font-black text-theme-secondary uppercase leading-tight">
                      {enrollment.courses?.title || 'كورس محذوف'}
                    </h3>
                    {enrollment.courses?.description && (
                      <p className="text-theme-muted text-sm line-clamp-2 leading-relaxed">
                        {enrollment.courses.description}
                      </p>
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
