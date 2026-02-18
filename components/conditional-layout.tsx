'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Show public header/footer on home, courses, course detail, and about
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/courses' ||
    pathname.startsWith('/courses/')

  if (isPublicRoute) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    )
  }

  return <>{children}</>
}
