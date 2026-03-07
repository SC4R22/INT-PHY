"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string | null;
  userRole?: string | null;
}

export function Header({ isLoggedIn = false, userName = null, userRole = null }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "الرئيسية", href: "/" },
    { name: "الكورسات", href: "/courses" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b nav-bg backdrop-blur border-[var(--border-color)]">
      <nav className="container-custom flex items-center justify-between h-16 lg:h-20">

        {/* ── Logo ── */}
        <Link
          href={isLoggedIn ? (userRole === 'admin' || userRole === 'teacher' ? '/admin' : '/dashboard') : '/'}
          className="flex items-center flex-shrink-0"
        >
          <span
            className="text-3xl lg:text-4xl text-primary leading-none select-none"
            style={{ fontFamily: '"Rakkas", serif', fontWeight: 400, letterSpacing: '0.02em' }}
          >
            المبدع
          </span>
        </Link>

        {/* ── Desktop nav links ── */}
        <div className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-base font-semibold text-theme-secondary hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-tajawal)" }}
            >
              {item.name}
            </Link>
          ))}
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="text-base font-semibold text-theme-secondary hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-tajawal)" }}
            >
              الداشبورد
            </Link>
          )}
        </div>

        {/* ── Desktop right actions ── */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm">
                  {userName?.charAt(0).toUpperCase()}
                </div>
                <span className="text-theme-primary font-semibold text-sm" style={{ fontFamily: "var(--font-tajawal)" }}>
                  {userName}
                </span>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-base font-semibold text-theme-secondary hover:text-primary transition-colors px-2"
                  style={{ fontFamily: "var(--font-tajawal)" }}
                >
                  خروج
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-base font-semibold text-theme-secondary hover:text-primary transition-colors px-2"
                style={{ fontFamily: "var(--font-tajawal)" }}
              >
                دخول
              </Link>
              <Link
                href="/signup"
                className="btn btn-primary text-base px-5 py-2.5 whitespace-nowrap"
                style={{ fontFamily: "var(--font-tajawal)", fontWeight: 700 }}
              >
                سجل حساب
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile toggle ── */}
        <div className="flex md:hidden items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-lg text-theme-secondary hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-nav)]">
          <div className="flex flex-col gap-1 px-4 pb-4 pt-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-4 py-3 text-base font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-tajawal)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="block px-4 py-3 text-base font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-tajawal)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                الداشبورد
              </Link>
            )}
            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-color)] mt-2">
              {isLoggedIn ? (
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="block w-full text-center px-4 py-3 text-base font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-tajawal)" }}
                  >
                    خروج {userName ? `(${userName})` : ""}
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-3 text-base font-semibold text-theme-secondary hover:text-primary hover:bg-[var(--bg-card-alt)] rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-tajawal)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    دخول
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center btn btn-primary text-base"
                    style={{ fontFamily: "var(--font-tajawal)", fontWeight: 700 }}
                    onClick={() => setMobileMenuOpen(false)}
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
  );
}
