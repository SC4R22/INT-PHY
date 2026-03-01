import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center p-4">
        <div className="bg-theme-card rounded-xl p-8 max-w-lg w-full border-2 border-primary">
          <h2 className="text-2xl font-bold text-theme-primary mb-3">Profile Not Found</h2>
          <p className="text-theme-secondary mb-4">
            Your account is logged in but no profile was found. Please sign out and contact support if the issue persists.
          </p>
          <div className="flex gap-3">
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="btn btn-primary">Sign Out</button>
            </form>
            <Link href="/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Student-specific data
  let enrollments: any[] = []
  let continueWatching: any = null
  let coursesWithProgress: any[] = []
  let expiredEnrollments: any[] = []

  if (profile.role === 'student') {
    const { data: enrollmentData } = await admin
      .from('enrollments')
      .select(`
        *,
        courses:course_id (id, title, description, deleted_at, thumbnail_url)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
    enrollments = enrollmentData || []

    // Fetch continue-watching in a single query (prefer incomplete, fall back to most recent)
    const { data: recentProgress } = await admin
      .from('user_progress')
      .select(`
        *,
        videos:video_id (
          id, title, duration, module_id,
          modules:module_id (title, course_id, courses:course_id (id, title))
        )
      `)
      .eq('user_id', user.id)
      .order('last_watched_at', { ascending: false })
      .limit(5)

    // Prefer first incomplete, otherwise fall back to most recently watched
    const incompleteEntry = recentProgress?.find((p: any) => !p.completed && p.videos)
    const recentEntry = recentProgress?.find((p: any) => p.videos)
    continueWatching = incompleteEntry || recentEntry || null

    const activeEnrollments = enrollments.filter((e: any) => !e.courses?.deleted_at)
    expiredEnrollments = enrollments.filter((e: any) => !!e.courses?.deleted_at)

    // Batch: get all videos for all active courses in ONE query
    const activeCourseIds = activeEnrollments.map((e: any) => e.courses?.id).filter(Boolean)

    if (activeCourseIds.length > 0) {
      const { data: allCourseVideos } = await admin
        .from('videos')
        .select('id, modules!inner(course_id)')
        .in('modules.course_id', activeCourseIds)

      const { data: allProgress } = await admin
        .from('user_progress')
        .select('video_id, completed')
        .eq('user_id', user.id)
        .eq('completed', true)

      const completedVideoIds = new Set((allProgress || []).map((p: any) => p.video_id))

      // Group video counts by course_id
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
        {/* Header */}
        <header className="bg-gradient-to-r from-primary to-primary/80 p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-payback font-bold text-white uppercase italic">
              Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <ThemeToggle />
              {profile.role === 'admin' && (
                <Link href="/admin" className="px-3 py-1.5 md:px-4 md:py-2 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 transition-all text-sm md:text-base">
                  ⚙️ Admin Panel
                </Link>
              )}
              <span className="hidden sm:block text-white font-semibold text-sm">{profile.full_name}</span>
              <span className="px-2 py-1 bg-white text-primary rounded-full text-xs font-bold uppercase">
                {profile.role}
              </span>
              <form action="/api/auth/signout" method="post">
                <button className="px-3 py-1.5 md:px-4 md:py-2 bg-white text-primary rounded-lg font-bold hover:bg-gray-100 transition-all text-sm md:text-base">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="bg-theme-card rounded-xl p-5 md:p-8 mb-8 border border-[var(--border-color)]">
            <h2 className="text-3xl font-bold text-theme-secondary mb-2">
              Welcome back, {profile.full_name}!
            </h2>
            <p className="text-theme-primary text-lg">
              {profile.role === 'admin' && 'Oversee the platform'}
              {profile.role === 'teacher' && 'Manage your courses and content'}
            </p>
          </div>

          {profile.role === 'teacher' && (
            <div>
              <h3 className="text-2xl font-bold text-theme-secondary mb-6">Teacher Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { href: '/admin/courses', label: '📚 My Courses', desc: 'View and manage your courses' },
                  { href: '/admin/courses/new', label: '➕ New Course', desc: 'Create a new course' },
                  { href: '/admin/codes', label: '🎟️ Access Codes', desc: 'Generate codes for students' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-theme-card rounded-xl p-6 text-center hover:bg-[var(--bg-card-alt)] transition-all border-2 border-[var(--border-color)] hover:border-primary"
                  >
                    <h4 className="text-xl font-bold text-theme-primary mb-2">{item.label}</h4>
                    <p className="text-theme-secondary">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {profile.role === 'admin' && (
            <div>
              <h3 className="text-2xl font-bold text-theme-secondary mb-6">Admin Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { href: '/admin', label: '⚙️ Admin Panel', desc: 'Go to the full admin dashboard' },
                  { href: '/admin/courses', label: '📚 Manage Courses', desc: 'Create, edit and delete courses' },
                  { href: '/admin/users', label: '👥 Manage Users', desc: 'View and manage all users' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-theme-card rounded-xl p-6 text-center hover:bg-[var(--bg-card-alt)] transition-all border-2 border-[var(--border-color)] hover:border-primary"
                  >
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

          {/* Left — Logo */}
          <Link href="/dashboard" className="font-payback font-black text-primary text-2xl uppercase italic tracking-wide flex-shrink-0">
            INT-PHYSICS
          </Link>

          {/* Center — Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all"
            >
              Dashboard
            </Link>
            <Link
              href="/courses"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all"
            >
              Browse Courses
            </Link>
          </nav>

          {/* Right — Theme toggle + Avatar + Sign out */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-theme-primary font-semibold text-sm">{profile.full_name}</span>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-theme-secondary hover:text-theme-primary border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-lg transition-all"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-[var(--border-color)] px-4 py-2 flex gap-2">
          <Link
            href="/dashboard"
            className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all"
          >
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all"
          >
            Browse Courses
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Top Row: Continue Watching + Get New Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Continue Watching */}
          {continueWatching ? (() => {
            const vid = continueWatching.videos as any
            const mod = vid?.modules as any
            const course = mod?.courses as any
            const dur = vid?.duration || 0
            const pos = continueWatching.last_position || 0
            const watchedPct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0
            const remainingPct = 100 - watchedPct

            return (
              <Link
                href={`/dashboard/watch/${continueWatching.video_id}`}
                className="group relative bg-theme-card rounded-2xl overflow-hidden border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex items-center justify-center"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/80 transition-all border-2 border-white/30">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-14 flex">
                  <div
                    className="bg-primary flex items-center justify-center text-white font-black text-xl font-payback transition-all"
                    style={{ width: `${watchedPct}%`, minWidth: watchedPct > 0 ? '2.5rem' : '0' }}
                  >
                    {watchedPct > 8 ? `${watchedPct}%` : ''}
                  </div>
                  <div className="bg-[var(--bg-card-alt)] flex items-center justify-center text-theme-secondary font-black text-xl font-payback flex-1">
                    {remainingPct < 100 ? `${remainingPct}%` : ''}
                  </div>
                </div>

                <div className="absolute top-4 left-4 right-4 bg-[var(--bg-card-alt)]/90 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-primary text-xs font-bold uppercase tracking-wider mb-0.5">
                    {continueWatching.completed ? '↩ Last Watched' : '▶ Continue Watching'}
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
                <p className="text-theme-primary font-bold mb-1">No videos in progress</p>
                <p className="text-theme-secondary text-sm">Start watching to see your progress here</p>
              </div>
            </div>
          )}

          {/* Get New Courses */}
          <Link
            href="/courses"
            className="group bg-theme-card rounded-2xl border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex flex-col items-center justify-center gap-6 p-8"
          >
            <h3 className="text-4xl md:text-5xl font-payback font-black text-theme-primary text-center uppercase italic leading-tight">
              Get<br />New Courses
            </h3>
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-6xl font-bold text-white leading-none">+</span>
            </div>
          </Link>
        </div>

        {/* Your Courses Section */}
        <div>
          <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-primary uppercase italic mb-6">
            Your Course
          </h2>

          {coursesWithProgress.length === 0 ? (
            <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
              <p className="text-6xl mb-4">📚</p>
              <p className="text-theme-primary text-2xl font-bold mb-2">No courses yet</p>
              <p className="text-theme-secondary mb-6">Enroll in a course to start learning</p>
              <Link href="/courses" className="btn btn-primary">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {coursesWithProgress.map((enrollment: any, index: number) => (
                <div
                  key={enrollment.id}
                  className="bg-theme-card rounded-2xl border-2 border-primary overflow-hidden hover:border-primary/80 transition-all hover:scale-[1.02]"
                >
                  {enrollment.courses?.thumbnail_url && (
                    <div className="h-36 w-full overflow-hidden relative">
                      <Image src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col items-center text-center gap-4">
                    <h3 className="text-2xl font-payback font-black text-theme-primary uppercase leading-tight">
                      {enrollment.courses?.title || `Course ${index + 1}`}
                    </h3>
                    {enrollment.courses?.description && (
                      <p className="text-theme-secondary text-sm line-clamp-3 leading-relaxed">
                        {enrollment.courses.description}
                      </p>
                    )}
                    <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${enrollment.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-primary text-sm font-bold">
                      {enrollment.progressPercent}% Complete
                    </p>
                    <Link
                      href={`/dashboard/courses/${enrollment.courses?.id}`}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold font-payback text-lg hover:bg-primary/80 transition-all uppercase"
                    >
                      Enter
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired Courses Section */}
        {expiredEnrollments.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-4xl md:text-5xl font-payback font-black text-theme-secondary uppercase italic">
                Expired Courses
              </h2>
              <span className="px-3 py-1 bg-[var(--bg-card-alt)] text-theme-secondary text-sm font-bold rounded-full border border-[var(--border-color)]">
                {expiredEnrollments.length}
              </span>
            </div>
            <p className="text-theme-secondary text-sm mb-6">
              These courses are no longer available. Videos are locked but any downloadable files remain accessible.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {expiredEnrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="bg-theme-card rounded-2xl border-2 border-[var(--border-color)] overflow-hidden opacity-75"
                >
                  <div className="bg-[var(--bg-card-alt)] px-4 py-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-theme-secondary uppercase tracking-widest">⛔ Course Removed</span>
                  </div>
                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <h3 className="text-xl font-payback font-black text-theme-secondary uppercase leading-tight">
                      {enrollment.courses?.title || 'Deleted Course'}
                    </h3>
                    {enrollment.courses?.description && (
                      <p className="text-theme-muted text-sm line-clamp-2 leading-relaxed">
                        {enrollment.courses.description}
                      </p>
                    )}
                    <div className="w-full bg-[var(--bg-card-alt)] rounded-lg px-4 py-3 flex items-center justify-center gap-2 border border-[var(--border-color)]">
                      <span className="text-lg">🔒</span>
                      <span className="text-theme-secondary text-xs font-semibold">Videos locked</span>
                    </div>
                    <Link
                      href={`/dashboard/courses/${enrollment.courses?.id}?expired=1`}
                      className="w-full py-3 bg-[var(--bg-card-alt)] text-theme-secondary rounded-xl font-bold font-payback text-sm hover:bg-[var(--border-color)] transition-all uppercase border border-[var(--border-color)]"
                    >
                      📁 View Files
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
