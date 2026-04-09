import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function StudentsPage() {
  const admin = createAdminClient()

  const { data: students } = await admin
    .from('user_profiles')
    .select('id, full_name, phone_number, parent_name, parent_phone_number, created_at, is_banned')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: enrollmentCounts } = await admin
    .from('enrollments')
    .select('user_id')
    .limit(5000)

  const countMap: Record<string, number> = {}
  for (const row of enrollmentCounts ?? []) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + 1
  }

  const total = students?.length || 0
  const banned = students?.filter(s => s.is_banned).length || 0
  const active = total - banned

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">الطلاب</h1>
        <p className="text-theme-secondary">كل الطلاب المسجلين على المنصة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-primary">
          <p className="text-theme-secondary text-sm">إجمالي الطلاب</p>
          <p className="text-3xl font-bold text-theme-primary">{total}</p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-theme-secondary text-sm">نشيط</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{active}</p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-red-500">
          <p className="text-theme-secondary text-sm">محظور</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{banned}</p>
        </div>
      </div>

      {/* Mobile cards (< md) */}
      <div className="md:hidden space-y-3">
        {students && students.length > 0 ? students.map((student: any) => (
          <Link key={student.id} href={`/admin/users/${student.id}`} className="block bg-theme-card rounded-xl border border-[var(--border-color)] p-4 hover:border-primary transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-theme-primary font-bold truncate">{student.full_name}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
                student.is_banned ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-500/20 text-green-700 dark:text-green-400'
              }`}>{student.is_banned ? 'محظور' : 'نشيط'}</span>
            </div>
            <p className="text-theme-secondary text-sm font-mono mb-1">{student.phone_number}</p>
            {student.parent_name && <p className="text-theme-muted text-xs mb-1">ولي الأمر: {student.parent_name} • {student.parent_phone_number}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded">{countMap[student.id] || 0} كورس</span>
              <span className="text-theme-muted text-xs">{new Date(student.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        )) : <p className="text-center text-theme-secondary py-12">لا يوجد طلاب بعد</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-theme-card rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
              <tr>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الطالب</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الهاتف</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">ولي الأمر</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الكورسات</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">تاريخ التسجيل</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[var(--border-color)]">
              {students && students.length > 0 ? students.map((student: any) => (
                <tr key={student.id} className="hover:bg-[var(--bg-card-alt)] transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <Link href={`/admin/users/${student.id}`} className="text-theme-primary font-semibold hover:text-primary transition-colors">{student.full_name}</Link>
                  </td>
                  <td className="px-6 py-4 text-theme-secondary font-mono text-sm">{student.phone_number}</td>
                  <td className="px-6 py-4">
                    {student.parent_name ? (
                      <div>
                        <p className="text-theme-primary text-sm">{student.parent_name}</p>
                        <p className="text-theme-secondary text-xs font-mono">{student.parent_phone_number}</p>
                      </div>
                    ) : <span className="text-theme-muted text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-primary/20 text-primary text-sm font-bold rounded">{countMap[student.id] || 0} كورس</span></td>
                  <td className="px-6 py-4 text-theme-secondary text-sm">{new Date(student.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      student.is_banned ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-500/20 text-green-700 dark:text-green-400'
                    }`}>{student.is_banned ? 'محظور' : 'نشيط'}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-theme-secondary">لا يوجد طلاب بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
