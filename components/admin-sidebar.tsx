'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

function NavLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string
  icon: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#3A3A3A] rounded-lg transition-all group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <span className="font-semibold">{children}</span>
    </Link>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const navItems = (
    <nav className="flex-1 p-4 space-y-2">
      <NavLink href="/admin" icon="📊" onClick={close}>Dashboard</NavLink>
      <NavLink href="/admin/courses" icon="📚" onClick={close}>Courses</NavLink>
      <NavLink href="/admin/students" icon="👥" onClick={close}>Students</NavLink>
      <NavLink href="/admin/users" icon="⚙️" onClick={close}>User Management</NavLink>
      <NavLink href="/admin/codes" icon="🎟️" onClick={close}>Access Codes</NavLink>
    </nav>
  )

  const backLink = (
    <div className="p-4 border-t-2 border-[#6A0DAD]">
      <Link
        href="/dashboard"
        onClick={close}
        className="flex items-center gap-3 px-4 py-3 text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#3A3A3A] rounded-lg transition-all"
      >
        <span className="text-xl">←</span>
        <span className="font-semibold">Back to Dashboard</span>
      </Link>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <aside className="hidden md:flex w-64 bg-[#2A2A2A] border-r-4 border-[#6A0DAD] flex-col shrink-0">
        <div className="p-6 border-b-2 border-[#6A0DAD]">
          <h1 className="text-2xl font-black text-[#EFEFEF] uppercase italic font-payback">
            Admin Panel
          </h1>
        </div>
        {navItems}
        {backLink}
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-[#2A2A2A] border-b-4 border-[#6A0DAD] px-4 h-14">
        <h1 className="text-xl font-black text-[#EFEFEF] uppercase italic font-payback">
          Admin Panel
        </h1>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-[#B3B3B3] hover:text-[#EFEFEF] hover:bg-[#3A3A3A] transition-all"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={close}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-[#2A2A2A] border-r-4 border-[#6A0DAD] flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navItems}
        {backLink}
      </aside>
    </>
  )
}
