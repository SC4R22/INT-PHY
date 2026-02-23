import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EnrollButton } from './enroll-button'
import type { Metadata } from 'next'
import Link from 'next/link'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('id', id)
    .single()

  if (!course) {
    return { title: 'Course Not Found — INTPHY' }
  }

  return {
    title: `${course.title} — INTPHY`,
    description: course.description ?? 'Physics course by Mr. Eslam Rabea.',
    openGraph: {
      title: `${course.title} — INTPHY`,
      description: course.description ?? 'Physics course by Mr. Eslam Rabea.',
      type: 'website',
    },
  }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch course
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .is('deleted_at', null)
    .single()

  if (error || !course) notFound()

  // Fetch modules with video counts
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id, title, order_index,
      videos (id, title, duration, order_index)
    `)
    .eq('course_id', id)
    .order('order_index')

  // Check if logged-in user is already enrolled
  const { data: { user } } = await supabase.auth.getUser()
  let isEnrolled = false
  if (user) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', id)
      .single()
    isEnrolled = !!enrollment
  }

  const totalVideos = modules?.reduce((acc, m) => acc + (m.videos?.length || 0), 0) || 0
  const totalDuration = modules?.reduce((acc, m) =>
    acc + (m.videos?.reduce((s: number, v: any) => s + (v.duration || 0), 0) || 0), 0) || 0

  // Get profile for smart header
  let profile: any = null
  if (user) {
    const { data } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single()
    profile = data
  }

  return (
    <div className="bg-[#25292D] min-h-screen">

      {/* Smart header */}
      {user && profile ? (
        <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="font-payback font-black text-primary text-2xl uppercase italic tracking-wide flex-shrink-0">INT-PHYSICS</Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all">Dashboard</Link>
              <Link href="/courses" className="px-4 py-2 rounded-lg text-sm font-semibold text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#2A2A2A] transition-all">Browse Courses</Link>
            </nav>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-[#EFEFEF] font-semibold text-sm">{profile.full_name}</span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button suppressHydrationWarning type="submit" className="px-3 py-1.5 text-xs font-bold text-[#B3B3B3] hover:text-[#EFEFEF] border border-[#3A3A3A] hover:border-[#555] rounded-lg transition-all">Sign Out</button>
              </form>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-50 w-full border-b border-[#3A3A3A] bg-[#1e2125]/95 backdrop-blur">
          <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
            <Link href="/" className="font-payback font-bold text-primary text-2xl">INT-PHYSICS</Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-[#B3B3B3] hover:text-primary transition-colors">Home</Link>
              <Link href="/courses" className="text-sm font-medium text-[#B3B3B3] hover:text-primary transition-colors">Courses</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium text-[#B3B3B3] hover:text-primary transition-colors">Log in</Link>
              <Link href="/signup" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/80 transition-colors">Sign up</Link>
            </div>
          </nav>
        </header>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/30 via-[#1e2125] to-[#25292D] border-b-2 border-primary/20">
        <div className="container-custom py-10 md:py-16">
          <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">

            {/* Left — course info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${course.is_free ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                  {course.is_free ? 'FREE COURSE' : 'PAID COURSE'}
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-6xl font-payback font-bold text-[#EFEFEF] leading-tight mb-4">
                  {course.title}
                </h1>
                <p className="text-[#B3B3B3] text-base md:text-lg leading-relaxed max-w-2xl">
                  {course.description}
                </p>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 md:gap-6 pt-4">
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <span className="text-2xl">📚</span>
                  <div>
                    <p className="text-[#EFEFEF] font-bold">{modules?.length || 0}</p>
                    <p className="text-xs">Modules</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <p className="text-[#EFEFEF] font-bold">{totalVideos}</p>
                    <p className="text-xs">Videos</p>
                  </div>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center gap-2 text-[#B3B3B3]">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <p className="text-[#EFEFEF] font-bold">{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m</p>
                      <p className="text-xs">Total Duration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — enroll card */}
            <div className="lg:col-span-1">
              <div className="bg-[#2A2A2A] rounded-2xl p-5 md:p-6 border-2 border-primary/30 shadow-xl shadow-primary/10 lg:sticky lg:top-24">
                {/* Price */}
                <div className="text-center mb-6">
                  <p className={`text-4xl font-payback font-bold mb-1 ${course.is_free ? 'text-green-400' : 'text-[#EFEFEF]'}`}>
                    {course.is_free ? 'Free' : `${course.price_cash} EGP`}
                  </p>
                  {!course.is_free && (
                    <p className="text-[#B3B3B3] text-sm">One-time cash payment</p>
                  )}
                </div>

                {/* Enroll button — client component handles the modal */}
                <EnrollButton
                  courseId={id}
                  courseTitle={course.title}
                  isFree={course.is_free}
                  isLoggedIn={!!user}
                  isEnrolled={isEnrolled}
                />

                {/* What's included */}
                <div className="mt-6 space-y-3 pt-6 border-t border-[#3A3A3A]">
                  <p className="text-[#B3B3B3] text-sm font-semibold uppercase tracking-wider">Includes</p>
                  {[
                    `${modules?.length || 0} modules`,
                    `${totalVideos} video lessons`,
                    'Lifetime access',
                    'Watch on any device',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-[#EFEFEF] text-sm">
                      <span className="text-green-400">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="container-custom py-16">
        <h2 className="text-3xl lg:text-4xl font-payback font-bold text-[#EFEFEF] mb-8">
          Course Curriculum
        </h2>

        {!modules || modules.length === 0 ? (
          <div className="text-center py-16 bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A]">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-[#B3B3B3] text-lg">Curriculum is being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod: any, modIndex: number) => (
              <div key={mod.id} className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-[#3A3A3A]">
                {/* Module header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-[#3A3A3A] gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {modIndex + 1}
                    </span>
                    <h3 className="text-[#EFEFEF] font-bold truncate">{mod.title}</h3>
                  </div>
                  <span className="text-[#B3B3B3] text-sm flex-shrink-0">
                    {mod.videos?.length || 0} video{mod.videos?.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Videos */}
                {mod.videos && mod.videos.length > 0 && (
                  <div className="divide-y divide-[#3A3A3A]">
                    {[...mod.videos]
                      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                      .map((video: any, vidIndex: number) => (
                        <div key={video.id} className="flex items-center justify-between px-4 md:px-6 py-3 gap-2">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <span className="text-primary text-sm w-5 flex-shrink-0">{vidIndex + 1}.</span>
                            <span className="text-lg md:text-2xl flex-shrink-0">🎬</span>
                            <span className={`text-sm truncate ${isEnrolled ? 'text-[#EFEFEF]' : 'text-[#B3B3B3]'}`}>
                              {video.title}
                            </span>
                          </div>
                          {video.duration && (
                            <span className="text-[#B3B3B3] text-xs flex-shrink-0">
                              {Math.floor(video.duration / 60)}m {video.duration % 60}s
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
