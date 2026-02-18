'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Courses', href: '/courses' },
    { name: 'About', href: '/about' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#3A3A3A] bg-[#1e2125]/95 backdrop-blur">
      <nav className="container-custom flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl lg:text-3xl font-payback font-bold text-primary">
            Physics
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm lg:text-base font-medium text-[#B3B3B3] hover:text-primary transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm lg:text-base font-medium text-[#B3B3B3] hover:text-primary transition-colors"
          >
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary text-sm lg:text-base">
            Sign up
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-lg text-[#B3B3B3] hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#3A3A3A] bg-[#1e2125]">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-[#B3B3B3] hover:text-primary hover:bg-[#2A2A2A] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 space-y-2">
              <Link
                href="/login"
                className="block w-full text-center px-3 py-2 text-base font-medium text-[#B3B3B3] hover:text-primary hover:bg-[#2A2A2A] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block w-full text-center btn btn-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
