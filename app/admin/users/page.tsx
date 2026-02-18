import { createClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, full_name, phone_number, role, created_at, is_banned')
    .order('created_at', { ascending: false })

  const roleCounts = {
    student: users?.filter(u => u.role === 'student').length || 0,
    admin: users?.filter(u => u.role === 'admin').length || 0,
    teacher: users?.filter(u => u.role === 'teacher').length || 0,
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-yellow-500/20 text-yellow-400',
    teacher: 'bg-blue-500/20 text-blue-400',
    student: 'bg-[#6A0DAD]/20 text-[#6A0DAD]',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">User Management</h1>
        <p className="text-[#B3B3B3]">All users across all roles</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-[#6A0DAD]">
          <p className="text-[#B3B3B3] text-sm">Students</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.student}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-[#B3B3B3] text-sm">Teachers</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.teacher}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-[#B3B3B3] text-sm">Admins</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.admin}</p>
        </div>
      </div>

      <div className="bg-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#6A0DAD]">
              <tr>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Name</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Phone</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Role</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Status</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#3A3A3A]">
              {users && users.length > 0 ? users.map((user: any) => (
                <tr key={user.id} className="hover:bg-[#3A3A3A] transition-colors">
                  <td className="px-6 py-4 text-[#EFEFEF] font-semibold">{user.full_name}</td>
                  <td className="px-6 py-4 text-[#B3B3B3] font-mono text-sm">{user.phone_number}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${roleColor[user.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {user.is_banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3] text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#B3B3B3]">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role change instructions */}
      <div className="mt-6 p-4 bg-[#2A2A2A] rounded-xl border-2 border-[#3A3A3A]">
        <p className="text-[#B3B3B3] text-sm">
          💡 To change a user&apos;s role, run the SQL queries in{' '}
          <code className="text-[#6A0DAD]">complete-admin-setup.sql</code> in your Supabase dashboard.
        </p>
      </div>
    </div>
  )
}
