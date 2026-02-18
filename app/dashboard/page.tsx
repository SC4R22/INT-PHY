import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile fetch fails, show a debug screen instead of redirect-looping
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-[#25292D] flex items-center justify-center p-4">
        <div className="bg-[#2A2A2A] rounded-xl p-8 max-w-lg w-full border-2 border-primary">
          <h2 className="text-2xl font-bold text-[#EFEFEF] mb-3">Profile Not Found</h2>
          <p className="text-[#B3B3B3] mb-4">
            You are logged in as <strong className="text-[#EFEFEF]">{user.email}</strong> but no profile row was found.
          </p>
          <p className="text-red-400 font-mono text-sm bg-[#1a1a1a] p-3 rounded-lg mb-5">
            {profileError?.message || 'No profile row found for this user ID'}
          </p>
          <div className="flex gap-3">
            <Link href="/api/auth/signout" className="btn btn-primary">
              Sign Out
            </Link>
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
    // Get enrollments — include deleted courses so we can show them in the expired section
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses:course_id (id, title, description, thumbnail_url, deleted_at)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
    enrollments = enrollmentData || []

    // Get continue watching — most recently watched incomplete video
    const { data: progressData } = await supabase
      .from('user_progress')
      .select(`
        *,
        videos:video_id (
          id, title, duration, module_id,
          modules:module_id (title, course_id, courses:course_id (id, title))
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('last_watched_at', { ascending: false })
      .limit(1)
      .single()

    if (progressData?.videos) {
      continueWatching = progressData
    }

    // Separate active and expired (deleted) courses
    const activeEnrollments = enrollments.filter((e: any) => !e.courses?.deleted_at)
    expiredEnrollments = enrollments.filter((e: any) => !!e.courses?.deleted_at)

    // Calculate progress for each active enrolled course
    for (const enrollment of activeEnrollments) {
      const courseId = enrollment.courses?.id
      if (!courseId) continue

      // Get all videos in this course
      const { data: allVideos } = await supabase
        .from('videos')
        .select('id, module_id, modules!inner(course_id)')
        .eq('modules.course_id', courseId)

      const totalVideos = allVideos?.length || 0

      // Get completed videos
      const { count: completedCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('video_id', allVideos?.map(v => v.id) || [])

      const completedVideos = completedCount || 0
      const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

      coursesWithProgress.push({
        ...enrollment,
        totalVideos,
        completedVideos,
        progressPercent,
      })
    }

  }

  // Non-student roles
  if (profile.role === 'teacher' || profile.role === 'admin') {
    return (
      <div className="min-h-screen bg-[#25292D]">
        {/* Header */}
        <header className="bg-gradient-to-r from-primary to-primary/80 p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-payback font-bold text-white uppercase italic">
              Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
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
        <main className="max-w-7xl mx-auto p-8">
          <div className="bg-[#2A2A2A] rounded-xl p-8 mb-8">
            <h2 className="text-3xl font-bold text-[#B3B3B3] mb-2">
              Welcome back, {profile.full_name}!
            </h2>
            <p className="text-[#EFEFEF] text-lg">
              {profile.role === 'admin' && 'Oversee the platform'}
              {profile.role === 'teacher' && 'Manage your courses and content'}
            </p>
          </div>

          {/* Teacher tools */}
          {profile.role === 'teacher' && (
            <div>
              <h3 className="text-2xl font-bold text-[#B3B3B3] mb-6">Teacher Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { href: '/admin/courses', label: '📚 My Courses', desc: 'View and manage your courses' },
                  { href: '/admin/courses/new', label: '➕ New Course', desc: 'Create a new course' },
                  { href: '/admin/codes', label: '🎟️ Access Codes', desc: 'Generate codes for students' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-[#2A2A2A] rounded-xl p-6 text-center hover:bg-[#3A3A3A] transition-all border-2 border-transparent hover:border-primary"
                  >
                    <h4 className="text-xl font-bold text-[#EFEFEF] mb-2">{item.label}</h4>
                    <p className="text-[#B3B3B3]">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Admin tools */}
          {profile.role === 'admin' && (
            <div>
              <h3 className="text-2xl font-bold text-[#B3B3B3] mb-6">Admin Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { href: '/admin', label: '⚙️ Admin Panel', desc: 'Go to the full admin dashboard' },
                  { href: '/admin/courses', label: '📚 Manage Courses', desc: 'Create, edit and delete courses' },
                  { href: '/admin/users', label: '👥 Manage Users', desc: 'View and manage all users' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-[#2A2A2A] rounded-xl p-6 text-center hover:bg-[#3A3A3A] transition-all border-2 border-transparent hover:border-primary"
                  >
                    <h4 className="text-xl font-bold text-[#EFEFEF] mb-2">{item.label}</h4>
                    <p className="text-[#B3B3B3]">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Student Dashboard (matching Figma design)
  return (
    <div className="min-h-screen bg-[#25292D]">
      {/* Student Header */}
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">

          {/* Left — Logo / brand */}
          <Link href="/dashboard" className="font-payback font-black text-primary text-2xl uppercase italic tracking-wide flex-shrink-0">
            INTPHY
          </Link>

          {/* Center — Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all"
            >
              Dashboard
            </Link>
            <Link
              href="/courses"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all"
            >
              Browse Courses
            </Link>
          </nav>

          {/* Right — Avatar + name + sign out */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Avatar + name */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-[#EFEFEF] font-semibold text-sm">{profile.full_name}</span>
            </div>

            {/* Sign out */}
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-[#B3B3B3] hover:text-[#EFEFEF] border border-[#3A3A3A] hover:border-[#555] rounded-lg transition-all"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-[#3A3A3A] px-4 py-2 flex gap-2">
          <Link
            href="/dashboard"
            className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all"
          >
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all"
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
                className="group relative bg-[#2A2A2A] rounded-2xl overflow-hidden border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex items-center justify-center"
              >
                {/* Center play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/80 transition-all border-2 border-white/30">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>

                {/* Split progress bar at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-14 flex">
                  <div
                    className="bg-primary flex items-center justify-center text-white font-black text-xl font-payback transition-all"
                    style={{ width: `${watchedPct}%`, minWidth: watchedPct > 0 ? '2.5rem' : '0' }}
                  >
                    {watchedPct > 8 ? `${watchedPct}%` : ''}
                  </div>
                  <div className="bg-[#1a1a1a] flex items-center justify-center text-[#B3B3B3] font-black text-xl font-payback flex-1">
                    {remainingPct < 100 ? `${remainingPct}%` : ''}
                  </div>
                </div>

                {/* Top overlay: course + video name */}
                <div className="absolute top-4 left-4 right-4 bg-[#1a1a1a]/85 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-primary text-xs font-bold uppercase tracking-wider mb-0.5">Continue Watching</p>
                  {course?.title && (
                    <p className="text-[#B3B3B3] text-xs mb-1 truncate">{course.title}</p>
                  )}
                  <p className="text-[#EFEFEF] font-bold text-sm line-clamp-1">{vid?.title}</p>
                </div>
              </Link>
            )
          })() : (
            <div className="bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A] min-h-[280px] flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-[#EFEFEF] font-bold mb-1">No videos in progress</p>
                <p className="text-[#B3B3B3] text-sm">Start watching to see your progress here</p>
              </div>
            </div>
          )}

          {/* Get New Courses */}
          <Link
            href="/courses"
            className="group bg-[#2A2A2A] rounded-2xl border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex flex-col items-center justify-center gap-6 p-8"
          >
            <h3 className="text-4xl md:text-5xl font-payback font-black text-[#EFEFEF] text-center uppercase italic leading-tight">
              Get<br />New Courses
            </h3>
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-6xl font-bold text-white leading-none">+</span>
            </div>
          </Link>
        </div>

        {/* Your Courses Section */}
        <div>
          <h2 className="text-4xl md:text-5xl font-payback font-black text-[#EFEFEF] uppercase italic mb-6">
            Your Course
          </h2>

          {coursesWithProgress.length === 0 ? (
            <div className="bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A] p-12 text-center">
              <p className="text-6xl mb-4">📚</p>
              <p className="text-[#EFEFEF] text-2xl font-bold mb-2">No courses yet</p>
              <p className="text-[#B3B3B3] mb-6">Enroll in a course to start learning</p>
              <Link href="/courses" className="btn btn-primary">
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {coursesWithProgress.map((enrollment: any, index: number) => (
                <div
                  key={enrollment.id}
                  className="bg-[#2A2A2A] rounded-2xl border-2 border-primary overflow-hidden hover:border-primary/80 transition-all hover:scale-[1.02]"
                >
                  <div className="p-6 flex flex-col items-center text-center gap-4">
                    <h3 className="text-2xl font-payback font-black text-[#EFEFEF] uppercase leading-tight">
                      {enrollment.courses?.title || `Course ${index + 1}`}
                    </h3>
                    {enrollment.courses?.description && (
                      <p className="text-[#B3B3B3] text-sm line-clamp-3 leading-relaxed">
                        {enrollment.courses.description}
                      </p>
                    )}

                    {/* Progress indicator */}
                    <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
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
              <h2 className="text-4xl md:text-5xl font-payback font-black text-[#B3B3B3] uppercase italic">
                Expired Courses
              </h2>
              <span className="px-3 py-1 bg-[#3A3A3A] text-[#B3B3B3] text-sm font-bold rounded-full border border-[#4A4A4A]">
                {expiredEnrollments.length}
              </span>
            </div>
            <p className="text-[#B3B3B3] text-sm mb-6">
              These courses are no longer available. Videos are locked but any downloadable files remain accessible.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {expiredEnrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="bg-[#1e2125] rounded-2xl border-2 border-[#3A3A3A] overflow-hidden opacity-75"
                >
                  {/* Expired banner */}
                  <div className="bg-[#3A3A3A] px-4 py-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-[#B3B3B3] uppercase tracking-widest">⛔ Course Removed</span>
                  </div>

                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <h3 className="text-xl font-payback font-black text-[#B3B3B3] uppercase leading-tight">
                      {enrollment.courses?.title || 'Deleted Course'}
                    </h3>
                    {enrollment.courses?.description && (
                      <p className="text-[#555] text-sm line-clamp-2 leading-relaxed">
                        {enrollment.courses.description}
                      </p>
                    )}

                    {/* Locked videos indicator */}
                    <div className="w-full bg-[#2A2A2A] rounded-lg px-4 py-3 flex items-center justify-center gap-2 border border-[#3A3A3A]">
                      <span className="text-lg">🔒</span>
                      <span className="text-[#B3B3B3] text-xs font-semibold">Videos locked</span>
                    </div>

                    {/* Files button — links to course page which shows files only */}
                    <Link
                      href={`/dashboard/courses/${enrollment.courses?.id}?expired=1`}
                      className="w-full py-3 bg-[#3A3A3A] text-[#B3B3B3] rounded-xl font-bold font-payback text-sm hover:bg-[#4A4A4A] transition-all uppercase border border-[#4A4A4A]"
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
