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

    // Get continue watching (most recent incomplete video)
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
      .order('updated_at', { ascending: false })
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
        <header className="bg-gradient-to-r from-primary to-primary/80 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-payback font-bold text-white uppercase italic">
              Dashboard
            </h1>
            <div className="flex items-center gap-4">
              {profile.role === 'admin' && (
                <Link href="/admin" className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 transition-all">
                  ⚙️ Admin Panel
                </Link>
              )}
              <span className="text-white font-semibold">{profile.full_name}</span>
              <span className="px-3 py-1 bg-white text-primary rounded-full text-sm font-bold uppercase">
                {profile.role}
              </span>
              <form action="/api/auth/signout" method="post">
                <button className="px-4 py-2 bg-white text-primary rounded-lg font-bold hover:bg-gray-100 transition-all">
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
      {/* Top Header */}
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Hamburger menu */}
          <button className="flex flex-col gap-1.5 p-2" aria-label="Menu">
            <span className="w-8 h-1 bg-[#B3B3B3] rounded"></span>
            <span className="w-8 h-1 bg-[#B3B3B3] rounded"></span>
            <span className="w-8 h-1 bg-[#B3B3B3] rounded"></span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[#EFEFEF] font-bold text-sm md:text-base">{profile.full_name}</p>
              <div className="flex items-center gap-2 justify-end mt-1">
                <span className="text-xs text-[#B3B3B3] bg-[#2A2A2A] px-2 py-1 rounded border border-[#3A3A3A]">
                  Code: <span className="text-primary font-bold">******</span>
                </span>
                <span className="text-xs text-[#B3B3B3] bg-[#2A2A2A] px-2 py-1 rounded border border-[#3A3A3A]">
                  Courses: <span className="text-primary font-bold">{enrollments.length}</span>
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-xl">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Top Row: Continue Watching + Get New Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Continue Watching */}
          {continueWatching ? (
            <Link
              href={`/dashboard/watch/${continueWatching.video_id}`}
              className="group relative bg-[#2A2A2A] rounded-2xl overflow-hidden border-2 border-primary hover:border-primary/80 transition-all hover:scale-[1.02] min-h-[280px] flex items-center justify-center"
            >
              {/* Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-[#B3B3B3]/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-l-[24px] border-l-[#EFEFEF] border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent ml-2"></div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-16 flex">
                <div
                  className="bg-primary flex items-center justify-center text-white font-black text-2xl font-payback"
                  style={{ width: `${Math.round((continueWatching.last_position || 0) / (continueWatching.videos?.duration || 1) * 100)}%` }}
                >
                  {Math.round((continueWatching.last_position || 0) / (continueWatching.videos?.duration || 1) * 100)}%
                </div>
                <div className="bg-white flex items-center justify-center text-[#1a1a1a] font-black text-2xl font-payback flex-1">
                  {100 - Math.round((continueWatching.last_position || 0) / (continueWatching.videos?.duration || 1) * 100)}%
                </div>
              </div>

              {/* Title overlay */}
              <div className="absolute top-4 left-4 right-4 bg-[#1a1a1a]/80 backdrop-blur-sm rounded-lg p-3">
                <p className="text-[#B3B3B3] text-xs mb-1">Continue Watching</p>
                <p className="text-[#EFEFEF] font-bold text-sm line-clamp-1">{continueWatching.videos?.title}</p>
              </div>
            </Link>
          ) : (
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
