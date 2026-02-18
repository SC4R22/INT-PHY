import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2A2A2A] border-r-4 border-[#6A0DAD] flex flex-col">
        <div className="p-6 border-b-2 border-[#6A0DAD]">
          <h1 className="text-2xl font-black text-[#EFEFEF] uppercase italic font-payback">
            Admin Panel
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/admin" icon="📊">
            Dashboard
          </NavLink>
          <NavLink href="/admin/courses" icon="📚">
            Courses
          </NavLink>
          <NavLink href="/admin/students" icon="👥">
            Students
          </NavLink>
          <NavLink href="/admin/users" icon="⚙️">
            User Management
          </NavLink>
          <NavLink href="/admin/codes" icon="🎟️">
            Access Codes
          </NavLink>
        </nav>

        <div className="p-4 border-t-2 border-[#6A0DAD]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#3A3A3A] rounded-lg transition-all"
          >
            <span className="text-xl">←</span>
            <span className="font-semibold">Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#3A3A3A] rounded-lg transition-all group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <span className="font-semibold">{children}</span>
    </Link>
  )
}
