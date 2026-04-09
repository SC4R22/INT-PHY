'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

function WalletIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 3H8L6 7h12l-2-4Z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

interface HeaderProps {
  isLoggedIn?: boolean
  userName?: string | null
  userRole?: string | null
  walletBalance?: number | null
}

export function Header({
  isLoggedIn = false,
  userName = null,
  userRole = null,
  walletBalance = null,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const isStudent = userRole === 'student'
  const isAdmin = userRole === 'admin' || userRole === 'teacher'

  const navLinks = [
    { name: 'الرئيسية', href: '/' },
    { name: 'الكورسات', href: '/courses' },
    ...(isLoggedIn && isStudent
      ? [
          { name: 'الداشبورد', href: '/dashboard' },
          { name: 'المتجر', href: '/store' },
        ]
      : []),
    ...(isLoggedIn && isAdmin
      ? [{ name: 'لوحة التحكم', href: '/admin' }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b nav-bg backdrop-blur border-[var(--border-color)]">
      {/* Force LTR so logo=left, profile=right regardless of page dir */}
      <nav className="container-custom flex items-center justify-between h-16" dir="ltr">

        {/* ── LEFT: Logo ── */}
        <Link
          href={isLoggedIn ? (isAdmin ? '/admin' : '/dashboard') : '/'}
          className="flex items-center flex-shrink-0"
        >
          <span
            className="text-3xl text-primary leading-none select-none"
            style={{ fontFamily: '"Rakkas", serif', fontWeight: 400 }}
          >
            المبدع
          </span>
        </Link>

        {/* ── CENTER: nav links ── */}
        <div className="hidden md:flex items-center gap-1">
          <ThemeToggle />
          <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] transition-all"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* ── RIGHT: profile / auth ── */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-card-alt)] transition-all" dir="rtl">
              <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {userName?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col leading-tight" dir="ltr">
                <span className="text-theme-primary font-semibold text-sm">{userName}</span>
                {isStudent && walletBalance !== null && (
                  <span className="flex items-center gap-1 text-primary text-xs font-bold">
                    <WalletIcon className="w-3 h-3" />
                    {walletBalance} جنيه
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-theme-secondary hover:text-primary transition-colors px-3 py-1.5"
              >
                دخول
              </Link>
              <Link
                href="/signup"
                className="bg-brand-gradient text-white text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                سجل حساب
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile: theme + hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-lg text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="فتح القائمة"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-nav)] shadow-lg">
          <div className="flex flex-col px-4 pb-4 pt-2 gap-0.5">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-sm font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div className="pt-3 mt-2 border-t border-[var(--border-color)] space-y-1">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--bg-card-alt)]">
                    <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold text-sm truncate">{userName}</p>
                      {isStudent && walletBalance !== null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <WalletIcon className="w-3 h-3 text-primary" />
                          <span className="text-primary text-xs font-bold">{walletBalance} جنيه</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <form action="/api/auth/signout" method="post">
                    <button
                      type="submit"
                      className="block w-full text-right px-4 py-3 text-sm font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      خروج
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-3 text-sm font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    دخول
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center bg-brand-gradient text-white text-sm font-bold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                  >
                    سجل حساب
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
