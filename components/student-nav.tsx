import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

// Wallet icon — inline SVG
function WalletIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 3H8L6 7h12l-2-4Z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Home icon — house-chimney style (flaticon 9245158)
function HomeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l9 9A1 1 0 0 1 20.414 13H19v8a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5h-2v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8H3.586a1 1 0 0 1-.707-1.707l9-9Z" />
      <path d="M15 2h2a1 1 0 0 1 1 1v3.586l-3-3V3a1 1 0 0 1 0-1Z" opacity="0.6"/>
    </svg>
  )
}

// Store / cart icon — fi-rr-shopping-cart (flaticon UIcons 18996272)
function StoreIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.822,7.431A1,1,0,0,0,21,7H7.333L6.179,4.23A1.994,1.994,0,0,0,4.333,3H2A1,1,0,0,0,2,5H4.333l4.744,11.385A1,1,0,0,0,10,17H18a1,1,0,0,0,.949-.684l3-8.5A1,1,0,0,0,21.822,7.431Z"/>
      <circle cx="10.5" cy="19.5" r="1.5"/>
      <circle cx="17.5" cy="19.5" r="1.5"/>
    </svg>
  )
}

interface StudentNavProps {
  userName: string
  userRole: string
  walletBalance: number | null
}

export function StudentNav({ userName, userRole, walletBalance }: StudentNavProps) {
  const isAdmin = userRole === 'admin' || userRole === 'teacher'
  const isStudent = userRole === 'student'

  return (
    <header className="bg-[var(--bg-nav)] border-b border-[var(--border-color)] sticky top-0 z-40">
      {/* Force LTR so left=left, right=right regardless of page direction */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4" dir="ltr">

        {/* LEFT — logo */}
        <Link
          href={isAdmin ? '/admin' : '/dashboard'}
          className="text-primary text-2xl flex-shrink-0 select-none"
          style={{ fontFamily: '"Rakkas", serif', fontWeight: 400 }}
        >
          المبدع
        </Link>

        {/* CENTER — theme toggle | nav icons */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {isStudent && (
            <>
              <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
              <Link
                href="/dashboard"
                className="p-2 rounded-lg text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] transition-all"
                title="الرئيسية"
                aria-label="الرئيسية"
              >
                <HomeIcon className="w-5 h-5" />
              </Link>
              <Link
                href="/store"
                className="p-2 rounded-lg text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] transition-all"
                title="المتجر"
                aria-label="المتجر"
              >
                <StoreIcon className="w-5 h-5" />
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link href="/admin" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
                لوحة التحكم
              </Link>
              <Link href="/admin/users" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)] transition-all">
                المستخدمين
              </Link>
            </>
          )}
        </div>

        {/* RIGHT — avatar + name + wallet */}
        <div className="flex items-center gap-2 flex-shrink-0" dir="rtl">
          <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col leading-tight" dir="ltr">
            <span className="text-theme-primary font-semibold text-sm">{userName}</span>
            {isStudent && walletBalance !== null && (
              <span className="flex items-center gap-1 text-primary text-xs font-bold">
                <WalletIcon className="w-3 h-3" />
                {walletBalance} جنيه
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
