import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Courses — Physics Platform',
  description: 'Browse all available physics courses',
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('courses')
    .select('id, title, description, price_cash, is_free, created_at')
    .eq('published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: courses, error } = await query

  return (
    <div className="bg-[#25292D] min-h-screen">

      {/* Header bar */}
      <div className="bg-gradient-to-r from-primary to-primary/70 py-16">
        <div className="container-custom text-center">
          <h1 className="text-5xl lg:text-7xl font-payback font-bold text-white mb-4">All Courses</h1>
          <p className="text-white/80 text-lg">Choose a course and start learning today</p>
        </div>
      </div>

      <div className="container-custom py-12">

        {/* Search bar */}
        <form method="GET" className="mb-10 max-w-xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] text-xl">🔍</span>
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search courses..."
              className="w-full pl-12 pr-4 py-4 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-primary rounded-xl text-[#EFEFEF] outline-none placeholder:text-gray-500 text-lg transition-colors"
            />
            {q && (
              <Link href="/courses" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#EFEFEF] font-bold transition-colors">
                ✕
              </Link>
            )}
          </div>
        </form>

        {/* Result count */}
        {q && (
          <p className="text-[#B3B3B3] mb-6 text-center">
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
          <div className="text-center py-24 bg-[#2A2A2A] rounded-2xl border-2 border-dashed border-[#3A3A3A]">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-[#EFEFEF] text-2xl font-bold mb-2">
              {q ? 'No courses found' : 'No courses yet'}
            </p>
            <p className="text-[#B3B3B3] mb-6">
              {q ? `No courses match "${q}". Try a different search.` : 'Courses will appear here once published.'}
            </p>
            {q && (
              <Link href="/courses" className="btn btn-primary">Clear Search</Link>
            )}
          </div>
        )}

        {/* Course grid */}
        {courses && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group bg-[#2A2A2A] rounded-2xl overflow-hidden border-2 border-[#3A3A3A] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="absolute border border-primary/60 rounded-full"
                        style={{ width: `${(i + 1) * 30}%`, height: `${(i + 1) * 60}%`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    ))}
                  </div>
                  <span className="text-5xl font-payback font-bold text-primary/50 select-none">PHY</span>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-[#EFEFEF] font-bold text-xl mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {course.title}
                  </h2>
                  <p className="text-[#B3B3B3] text-sm leading-relaxed mb-5 flex-1 line-clamp-3">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-[#3A3A3A]">
                    <span className={`font-bold text-xl ${course.is_free ? 'text-green-400' : 'text-[#EFEFEF]'}`}>
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
