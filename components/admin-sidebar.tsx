'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const BRAND_GRADIENT = 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)'
const BORDER_GRADIENT_STYLE = { borderImage: `${BRAND_GRADIENT} 1` }

function NavLink({ href, icon, children, onClick }: {
  href: string; icon: string; children: React.ReactNode; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-all group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-semibold">{children}</span>
    </Link>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const navItems = (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      <NavLink href="/admin"                  icon="📊" onClick={close}>الداشبورد</NavLink>
      <NavLink href="/admin/courses"          icon="📚" onClick={close}>الكورسات</NavLink>
      <NavLink href="/admin/students"         icon="👥" onClick={close}>الطلاب</NavLink>
      <NavLink href="/admin/users"            icon="⚙️" onClick={close}>إدارة المستخدمين</NavLink>
      <NavLink href="/admin/codes"            icon="🎟️" onClick={close}>أكواد الدخول</NavLink>
      <NavLink href="/admin/standalone-exams" icon="📋" onClick={close}>الامتحانات المستقلة</NavLink>
      <NavLink href="/admin/store"            icon="🛍️" onClick={close}>المتجر</NavLink>
    </nav>
  )

  const backLink = (
    <div className="p-4 border-t-4" style={BORDER_GRADIENT_STYLE}>
      <Link
        href="/dashboard"
        onClick={close}
        className="flex items-center gap-3 px-4 py-3 text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-all"
      >
        <span className="text-xl">←</span>
        <span className="font-semibold">رجوع للداشبورد</span>
      </Link>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 bg-[var(--bg-card)] flex-col shrink-0 border-r-4"
        style={BORDER_GRADIENT_STYLE}
      >
        <div className="p-6 border-b-2 flex items-center justify-between" style={BORDER_GRADIENT_STYLE}>
          <Link href="/admin" className="flex items-center gap-2 group">
            <span
              className="text-2xl text-primary leading-none select-none"
              style={{ fontFamily: '"Rakkas", serif', fontWeight: 400 }}
            >
              المبدع
            </span>
            <span className="text-xs text-theme-secondary font-semibold border border-[var(--border-color)] px-2 py-0.5 rounded-full">
              إدارة
            </span>
          </Link>
          <ThemeToggle />
        </div>
        {navItems}
        {backLink}
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-[var(--bg-card)] px-4 h-14 border-b-4"
        style={BORDER_GRADIENT_STYLE}
      >
        <Link href="/admin" className="flex items-center gap-2">
          <span
            className="text-xl text-primary leading-none select-none"
            style={{ fontFamily: '"Rakkas", serif', fontWeight: 400 }}
          >
            المبدع
          </span>
          <span className="text-xs text-theme-secondary font-semibold border border-[var(--border-color)] px-2 py-0.5 rounded-full">
            إدارة
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all"
            aria-label="تبديل القائمة"
            suppressHydrationWarning
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={close} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-[var(--bg-card)] flex flex-col transition-transform duration-300 border-r-4 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={BORDER_GRADIENT_STYLE}
      >
        {navItems}
        {backLink}
      </aside>
    </>
  )
}
