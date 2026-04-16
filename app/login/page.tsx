'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'

function LoginContent() {
  const searchParams = useSearchParams()
  const isBanned = searchParams.get('banned') === '1'
  const isDeviceLimit = searchParams.get('device_limit') === '1'
  const deviceLimitMsg = searchParams.get('msg')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ phoneNumber: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await login(formData.phoneNumber, formData.password)
        if (result?.error) {
          setError('رقم الهاتف أو كلمة السر غلطة')
        }
      } catch {
        // redirect() throws internally in Next.js — not a real error
      }
    })
  }

  // Parse device lines from the message (each line is a device entry)
  const deviceLines = deviceLimitMsg
    ? decodeURIComponent(deviceLimitMsg)
        .split('\n')
        .filter((line) => line.trim().length > 0)
    : []
  const deviceLimitHeader = deviceLines[0] || 'وصلت للحد الأقصى من الأجهزة (٢ أجهزة).'
  const deviceEntries = deviceLines.slice(1)

  return (
    <div suppressHydrationWarning className="min-h-screen bg-theme-primary">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Header with brand gradient */}
      <div suppressHydrationWarning className="rounded-b-[2rem] p-8 md:p-16 text-center" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
        <h1 suppressHydrationWarning className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg font-payback">اهلا بيك يا فنان !</h1>
      </div>

      <div className="max-w-3xl mx-4 md:mx-auto mt-6 md:mt-8 bg-theme-card rounded-xl overflow-hidden shadow-2xl mb-8">
        {/* Tab bar with gradient bottom border */}
        <div suppressHydrationWarning className="flex" style={{ borderBottom: '4px solid transparent', borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1' }}>
          <a href="/signup"
            className="flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all text-center text-theme-secondary bg-theme-primary">
            سجل حساب
          </a>
          <div className="flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold text-center text-primary bg-theme-card">
            دخول
          </div>
        </div>
        <div className="p-6 md:p-12">
          {isBanned && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6 text-center font-bold">
              تم تعليق حسابك. يرجى التواصل مع الدعم.
            </div>
          )}

          {isDeviceLimit && (
            <div
              className="mb-6 rounded-xl overflow-hidden"
              style={{ border: '2px solid #f97316' }}
            >
              {/* Header */}
              <div className="px-4 py-3 text-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <p className="font-bold text-base" style={{ color: '#f97316' }}>
                  🚫 تم تسجيل خروجك
                </p>
                <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>
                  {deviceEntries.length > 0
                    ? 'وصلت للحد الأقصى (٢ أجهزة). الأجهزة المسجلة على حسابك:'
                    : deviceLimitHeader}
                </p>
              </div>

              {/* Device list */}
              {deviceEntries.length > 0 && (
                <div className="px-4 pb-4 pt-3 space-y-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {deviceEntries.map((line, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#e5e7eb',
                        direction: 'rtl',
                        lineHeight: 1.6,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                  <p className="text-xs text-center pt-1" style={{ color: '#6b7280' }}>
                    لو محتاج تغيير الجهاز، تواصل مع الدعم.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">رقم الهاتف</label>
              <input
                type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange}
                placeholder="ادخل رقم هاتفك" required autoComplete="tel"
                className="w-full px-4 py-4 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                style={{ border: '3px solid transparent', borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1' }}
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-theme-secondary text-sm font-semibold mb-2">كلمة السر</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                  placeholder="ادخل كلمة السر" required autoComplete="current-password"
                  className="w-full px-4 py-4 pr-14 bg-[var(--bg-input)] rounded-lg text-theme-primary focus:outline-none transition-all placeholder:text-theme-muted"
                  style={{ border: '3px solid transparent', borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1' }}
                  suppressHydrationWarning
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-primary transition-colors select-none">
                  <i className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-xl`} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={isPending} suppressHydrationWarning
              className="w-full py-5 text-white rounded-lg text-xl font-bold transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isPending ? '#E56900' : 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
              {isPending ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
