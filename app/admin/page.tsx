import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  // Get total counts — query underlying tables directly for reliability
  const { count: totalStudents } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('is_banned', false)

  const { count: totalCourses } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const { count: totalEnrollments } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })

  // Active students: new enrollments in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: activeStudents } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .gte('enrolled_at', sevenDaysAgo)

  // Get recent enrollments with user and course info
  const { data: recentEnrollmentsRaw } = await supabase
    .from('enrollments')
    .select('id, enrolled_at, user_id, course_id')
    .order('enrolled_at', { ascending: false })
    .limit(5)

  // Fetch related profile and course names
  const userIds = [...new Set((recentEnrollmentsRaw ?? []).map((e: any) => e.user_id))]
  const courseIds = [...new Set((recentEnrollmentsRaw ?? []).map((e: any) => e.course_id))]

  const { data: profilesData } = userIds.length
    ? await supabase.from('user_profiles').select('id, full_name, phone_number').in('id', userIds)
    : { data: [] }

  const { data: coursesData } = courseIds.length
    ? await supabase.from('courses').select('id, title').in('id', courseIds)
    : { data: [] }

  const profileMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]))
  const courseMap = new Map((coursesData ?? []).map((c: any) => [c.id, c]))

  const recentEnrollments = (recentEnrollmentsRaw ?? []).map((e: any) => ({
    ...e,
    user: profileMap.get(e.user_id) ?? null,
    course: courseMap.get(e.course_id) ?? null,
  }))

  // Top courses from the analytics view
  const { data: topCoursesData } = await supabase
    .from('course_analytics')
    .select('course_id, total_enrollments')
    .order('total_enrollments', { ascending: false })
    .limit(5)

  const topCoursesWithTitles = await Promise.all(
    (topCoursesData ?? []).map(async (row: any) => {
      const course = courseMap.get(row.course_id)
      if (course) return { courseId: row.course_id, title: (course as any).title, count: row.total_enrollments }
      // Fetch if not already in map
      const { data } = await supabase.from('courses').select('title').eq('id', row.course_id).single()
      return { courseId: row.course_id, title: data?.title ?? 'Unknown', count: row.total_enrollments ?? 0 }
    })
  )

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">
          Admin Dashboard
        </h1>
        <p className="text-theme-secondary">
          Overview of platform statistics and activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Students"
          value={totalStudents || 0}
          icon="👥"
          trend="All time"
          trendColor="text-[#B3B3B3]"
        />
        <StatCard
          title="Total Courses"
          value={totalCourses || 0}
          icon="📚"
          trend="Published + Drafts"
          trendColor="text-[#B3B3B3]"
        />
        <StatCard
          title="Total Enrollments"
          value={totalEnrollments || 0}
          icon="📝"
          trend="All courses"
          trendColor="text-[#B3B3B3]"
        />
        <StatCard
          title="Active Students"
          value={activeStudents || 0}
          icon="⚡"
          trend="Last 7 days"
          trendColor="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Enrollments */}
        <div className="bg-theme-card rounded-xl p-6 shadow-xl border border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-theme-primary mb-4">
            Recent Enrollments
          </h2>
          <div className="space-y-3">
            {recentEnrollments && recentEnrollments.length > 0 ? (
              recentEnrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="p-4 bg-[var(--bg-card-alt)] rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-theme-primary font-semibold">
                      {enrollment.user?.full_name ?? '—'}
                    </p>
                    <p className="text-theme-secondary text-sm">
                      {enrollment.course?.title ?? '—'}
                    </p>
                  </div>
                  <span className="text-primary text-sm">
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-theme-secondary text-center py-8">
                No enrollments yet
              </p>
            )}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-theme-card rounded-xl p-6 shadow-xl border border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-theme-primary mb-4">
            Top Courses by Enrollment
          </h2>
          <div className="space-y-3">
            {topCoursesWithTitles.length > 0 ? (
              topCoursesWithTitles.map((course, index) => (
                <div
                  key={course.courseId}
                  className="p-4 bg-[var(--bg-card-alt)] rounded-lg flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">
                      #{index + 1}
                    </span>
                    <p className="text-theme-primary font-semibold">
                      {course.title}
                    </p>
                  </div>
                  <span className="text-primary font-bold text-lg">
                    {course.count} students
                  </span>
                </div>
              ))
            ) : (
              <p className="text-theme-secondary text-center py-8">
                No course data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction
          href="/admin/courses/new"
          title="Create New Course"
          icon="➕"
          description="Add a new course to the platform"
        />
        <QuickAction
          href="/admin/codes"
          title="Generate Access Code"
          icon="🎟️"
          description="Create codes for course enrollment"
        />
        <QuickAction
          href="/admin/students"
          title="View All Students"
          icon="👥"
          description="Manage student accounts and progress"
        />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendColor = 'text-theme-secondary',
}: {
  title: string
  value: number
  icon: string
  trend: string
  trendColor?: string
}) {
  return (
    <div className="bg-theme-card rounded-xl p-6 shadow-xl border-2 border-primary">
      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">{icon}</span>
        <span className={`text-sm font-semibold ${trendColor}`}>{trend}</span>
      </div>
      <h3 className="text-theme-secondary text-sm font-semibold mb-1 uppercase tracking-wide">{title}</h3>
      <p className="text-4xl font-black text-theme-primary">{value}</p>
    </div>
  )
}

function QuickAction({
  href,
  title,
  icon,
  description,
}: {
  href: string
  title: string
  icon: string
  description: string
}) {
  return (
    <a
      href={href}
      className="bg-theme-card rounded-xl p-6 shadow-xl transition-all hover:-translate-y-1 border-2 border-[var(--border-color)] hover:border-primary group"
    >
      <div className="flex items-center gap-4 mb-3">
        <span className="text-4xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
        <h3 className="text-xl font-bold text-theme-primary">{title}</h3>
      </div>
      <p className="text-theme-secondary">{description}</p>
    </a>
  )
}
