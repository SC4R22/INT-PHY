import { createAdminClient } from '@/lib/supabase/admin'

export default async function StudentsPage() {
  const admin = createAdminClient()

  const { data: students } = await admin
    .from('user_profiles')
    .select('id, full_name, phone_number, parent_name, parent_phone_number, created_at, is_banned')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  // Get enrollment counts per student
  const { data: enrollmentCounts } = await admin
    .from('enrollments')
    .select('user_id')

  const countMap: Record<string, number> = {}
  for (const row of enrollmentCounts ?? []) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + 1
  }

  const total = students?.length || 0
  const banned = students?.filter(s => s.is_banned).length || 0
  const active = total - banned

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">Students</h1>
        <p className="text-[#B3B3B3]">All registered students on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-[#6A0DAD]">
          <p className="text-[#B3B3B3] text-sm">Total Students</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{total}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-[#B3B3B3] text-sm">Active</p>
          <p className="text-3xl font-bold text-green-400">{active}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-red-500">
          <p className="text-[#B3B3B3] text-sm">Banned</p>
          <p className="text-3xl font-bold text-red-400">{banned}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#6A0DAD]">
              <tr>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Student</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Phone</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Parent</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Courses</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Joined</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#3A3A3A]">
              {students && students.length > 0 ? students.map((student: any) => (
                <tr key={student.id} className="hover:bg-[#3A3A3A] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-[#EFEFEF] font-semibold">{student.full_name}</p>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3] font-mono text-sm">{student.phone_number}</td>
                  <td className="px-6 py-4">
                    {student.parent_name ? (
                      <div>
                        <p className="text-[#EFEFEF] text-sm">{student.parent_name}</p>
                        <p className="text-[#B3B3B3] text-xs font-mono">{student.parent_phone_number}</p>
                      </div>
                    ) : <span className="text-[#B3B3B3] text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#6A0DAD]/20 text-[#6A0DAD] text-sm font-bold rounded">
                      {countMap[student.id] || 0} courses
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3] text-sm">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {student.is_banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#B3B3B3]">No students registered yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
