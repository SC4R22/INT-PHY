import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = {
  title: 'Physics Courses by Eslam Rabea — INTPHY',
  description:
    'Browse all available physics courses by Mr. Eslam Rabea on INTPHY (Intelligent Physics). Grade 11 & Grade 12 HD video lessons for Egyptian students.',
  alternates: {
    canonical: 'https://int-phy.vercel.app/courses',
  },
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let profile: any = null
  if (user) {
    const { data } = await supabase.from('user_profiles').select('full_name, role').eq('id', user.id).single()
    profile = data
  }

  let query = supabase
    .from('courses')
    .select('id, title, description, price_cash, is_free, created_at, thumbnail_url')
    .eq('published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: courses, error } = await query

  return (
    <div className="bg-theme-primary min-h-screen">

      {/* Smart header */}
      {user && profile ? (
        <header className="bg-[var(--bg-nav)] border-b-2 border-[var(--border-color)]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="font-payback font-black text-primary text-2xl uppercase italic tracking-wide flex-shrink-0">
              INT-PHYSICS
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
                Dashboard
              </Link>
              <Link href="/courses" className="px-4 py-2 rounded-lg text-sm font-semibold text-primary bg-primary/10 transition-all">
                Browse Courses
              </Link>
            </nav>
            <div className="flex items-center gap-3 flex-shrink-0">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-theme-primary font-semibold text-sm">{profile.full_name}</span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button suppressHydrationWarning type="submit" className="px-3 py-1.5 text-xs font-bold text-theme-secondary hover:text-theme-primary border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-lg transition-all">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="md:hidden border-t border-[var(--border-color)] px-4 py-2 flex gap-2">
            <Link href="/dashboard" className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
              Dashboard
            </Link>
            <Link href="/courses" className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-primary bg-primary/10 transition-all">
              Browse Courses
            </Link>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--bg-nav)]/95 backdrop-blur">
          <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
            <Link href="/" className="font-payback font-bold text-primary text-2xl">INT-PHYSICS</Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-theme-secondary hover:text-primary transition-colors">Home</Link>
              <Link href="/courses" className="text-sm font-medium text-primary transition-colors">Courses</Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className="text-sm font-medium text-theme-secondary hover:text-primary transition-colors">Log in</Link>
              <Link href="/signup" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/80 transition-colors">Sign up</Link>
            </div>
          </nav>
        </header>
      )}

      {/* Header bar */}
      <div className="bg-gradient-to-r from-primary to-primary/70 py-10 md:py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-payback font-bold text-white mb-4">All Courses</h1>
          <p className="text-white/80 text-base md:text-lg">Choose a course and start learning today</p>
        </div>
      </div>

      <div className="container-custom py-12">

        {/* Search bar */}
        <form method="GET" className="mb-10 max-w-xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary text-xl">🔍</span>
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search courses..."
              suppressHydrationWarning
              className="w-full pl-12 pr-4 py-4 bg-theme-card border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted text-lg transition-colors"
            />
            {q && (
              <Link href="/courses" className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary font-bold transition-colors">
                ✕
              </Link>
            )}
          </div>
        </form>

        {/* Result count */}
        {q && (
          <p className="text-theme-secondary mb-6 text-center">
            {courses?.length || 0} result{courses?.length !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 font-semibold">Failed to load courses. Please try again.</p>
          </div>
        )}

        {/* Empty state */}
        {!error && (!courses || courses.length === 0) && (
          <div className="text-center py-24 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-theme-primary text-2xl font-bold mb-2">
              {q ? 'No courses found' : 'No courses yet'}
            </p>
            <p className="text-theme-secondary mb-6">
              {q ? `No courses match "${q}". Try a different search.` : 'Courses will appear here once published.'}
            </p>
            {q && <Link href="/courses" className="btn btn-primary">Clear Search</Link>}
          </div>
        )}

        {/* Course grid */}
        {courses && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group bg-theme-card rounded-2xl overflow-hidden border-2 border-[var(--border-color)] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-10">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="absolute border border-primary/60 rounded-full"
                            style={{ width: `${(i + 1) * 30}%`, height: `${(i + 1) * 60}%`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                        ))}
                      </div>
                      <span className="text-5xl font-payback font-bold text-primary/50 select-none">PHY</span>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-theme-primary font-bold text-xl mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {course.title}
                  </h2>
                  <p className="text-theme-secondary text-sm leading-relaxed mb-5 flex-1 line-clamp-3">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <span className={`font-bold text-xl ${course.is_free ? 'text-green-500' : 'text-theme-primary'}`}>
                      {course.is_free ? 'Free' : `${course.price_cash} EGP`}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
                      View <span>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
