import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get total counts
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

  // Active students: new enrollments in last 7 days (avoids relying on last_activity_at column)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: activeStudents } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .gte('enrolled_at', sevenDaysAgo)

  // Get recent enrollments
  const { data: recentEnrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      user:user_id (full_name, phone_number),
      course:course_id (title)
    `)
    .order('enrolled_at', { ascending: false })
    .limit(5)

  const { data: topCoursesData } = await supabase
    .from('course_analytics')
    .select('course_id, total_enrollments, courses:course_id(title)')
    .order('total_enrollments', { ascending: false })
    .limit(5)

  const topCourses = (topCoursesData ?? []).map((row: any) => ({
    courseId: row.course_id,
    title: row.courses?.title ?? 'Unknown',
    count: row.total_enrollments ?? 0,
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">
          Admin Dashboard
        </h1>
        <p className="text-[#B3B3B3]">
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
        <div className="bg-[#2A2A2A] rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-[#EFEFEF] mb-4">
            Recent Enrollments
          </h2>
          <div className="space-y-3">
            {recentEnrollments && recentEnrollments.length > 0 ? (
              recentEnrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="p-4 bg-[#3A3A3A] rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-[#EFEFEF] font-semibold">
                      {enrollment.user?.full_name}
                    </p>
                    <p className="text-[#B3B3B3] text-sm">
                      {enrollment.course?.title}
                    </p>
                  </div>
                  <span className="text-[#6A0DAD] text-sm">
                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[#B3B3B3] text-center py-8">
                No enrollments yet
              </p>
            )}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-[#2A2A2A] rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-[#EFEFEF] mb-4">
            Top Courses by Enrollment
          </h2>
          <div className="space-y-3">
            {topCourses.length > 0 ? (
              topCourses.map((course, index) => (
                <div
                  key={course.courseId}
                  className="p-4 bg-[#3A3A3A] rounded-lg flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-[#6A0DAD]">
                      #{index + 1}
                    </span>
                    <p className="text-[#EFEFEF] font-semibold">
                      {course.title}
                    </p>
                  </div>
                  <span className="text-[#6A0DAD] font-bold text-lg">
                    {course.count} students
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[#B3B3B3] text-center py-8">
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
  trendColor = 'text-[#B3B3B3]',
}: {
  title: string
  value: number
  icon: string
  trend: string
  trendColor?: string
}) {
  return (
    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#3A3A3A] rounded-xl p-6 shadow-xl border-2 border-[#6A0DAD]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">{icon}</span>
        <span className={`text-sm font-semibold ${trendColor}`}>{trend}</span>
      </div>
      <h3 className="text-[#B3B3B3] text-sm font-semibold mb-1">{title}</h3>
      <p className="text-4xl font-black text-[#EFEFEF]">{value}</p>
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
      className="bg-[#2A2A2A] rounded-xl p-6 shadow-xl hover:shadow-[#6A0DAD]/20 transition-all hover:-translate-y-1 border-2 border-transparent hover:border-[#6A0DAD] group"
    >
      <div className="flex items-center gap-4 mb-3">
        <span className="text-4xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
        <h3 className="text-xl font-bold text-[#EFEFEF]">{title}</h3>
      </div>
      <p className="text-[#B3B3B3]">{description}</p>
    </a>
  )
}
