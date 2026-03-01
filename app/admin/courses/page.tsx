import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  const admin = createAdminClient()

  // Use admin client so ALL courses show (including drafts), bypassing RLS
  const { data: courses } = await admin
    .from('courses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">
            Course Management
          </h1>
          <p className="text-theme-secondary">
            Create, edit, and manage all courses
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          <span>Create New Course</span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-theme-card rounded-lg p-4 border-2 border-primary">
          <p className="text-theme-secondary text-sm">Total Courses</p>
          <p className="text-3xl font-bold text-theme-primary">{courses?.length || 0}</p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-theme-secondary text-sm">Published</p>
          <p className="text-3xl font-bold text-green-500">
            {courses?.filter(c => c.published).length || 0}
          </p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-theme-secondary text-sm">Drafts</p>
          <p className="text-3xl font-bold text-yellow-500">
            {courses?.filter(c => !c.published).length || 0}
          </p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border border-[var(--border-color)]">
          <p className="text-theme-secondary text-sm">Free Courses</p>
          <p className="text-3xl font-bold text-blue-500">
            {courses?.filter(c => c.is_free).length || 0}
          </p>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-theme-card rounded-xl shadow-xl overflow-hidden border border-[var(--border-color)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary">
              <tr>
                <th className="px-6 py-4 text-left text-white font-bold">Course Title</th>
                <th className="px-6 py-4 text-left text-white font-bold">Status</th>
                <th className="px-6 py-4 text-left text-white font-bold">Price</th>
                <th className="px-6 py-4 text-left text-white font-bold">Created</th>
                <th className="px-6 py-4 text-right text-white font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {courses && courses.length > 0 ? (
                courses.map((course: any) => (
                  <tr key={course.id} className="hover:bg-[var(--bg-card-alt)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-theme-primary font-semibold">{course.title}</p>
                        <p className="text-theme-secondary text-sm line-clamp-1">{course.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {course.published ? (
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">PUBLISHED</span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">DRAFT</span>
                        )}
                        {course.is_free && (
                          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">FREE</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-theme-primary">
                      {course.is_free ? 'Free' : `${course.price_cash} EGP`}
                    </td>
                    <td className="px-6 py-4 text-theme-secondary text-sm">
                      {new Date(course.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/courses/${course.id}/content`}
                          className="px-3 py-1 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/80 transition-colors"
                        >
                          Content
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-theme-secondary text-lg mb-4">No courses created yet</p>
                    <Link
                      href="/admin/courses/new"
                      className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all"
                    >
                      Create Your First Course
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
