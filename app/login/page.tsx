'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/app/actions/auth'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBanned = searchParams.get('banned') === '1'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('login')
  const [formData, setFormData] = useState({ phoneNumber: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(formData.phoneNumber, formData.password)
      if (result?.error) { setError('Invalid phone number or password'); setLoading(false); return }
      // Server action handles redirect — nothing to do here
    } catch { setError('An unexpected error occurred.'); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="bg-gradient-to-br from-[#6A0DAD] to-[#8B2CAD] rounded-b-[2rem] p-8 md:p-16 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-[#E8E8E8] uppercase italic tracking-tighter drop-shadow-lg font-payback">WELCOME !</h1>
      </div>
      <div className="max-w-3xl mx-auto mt-6 md:mt-8 bg-[#2A2A2A] rounded-xl overflow-hidden shadow-2xl mb-8 mx-4 md:mx-auto">
        <div className="flex border-b-4 border-[#6A0DAD]">
          <button onClick={() => { setActiveTab('signup'); router.push('/signup') }}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${activeTab === 'signup' ? 'text-[#6A0DAD] bg-[#2A2A2A]' : 'text-[#EFEFEF] bg-[#1a1a1a]'}`} suppressHydrationWarning>Sign-up</button>
          <button onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 md:py-6 text-xl md:text-2xl font-extrabold transition-all ${activeTab === 'login' ? 'text-[#6A0DAD] bg-[#2A2A2A]' : 'text-[#EFEFEF] bg-[#1a1a1a]'}`} suppressHydrationWarning>Log-in</button>
        </div>
        <div className="p-6 md:p-12">
          {isBanned && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6 text-center font-bold">
              Your account has been suspended. Please contact support.
            </div>
          )}
          {error && <div className="bg-red-500 text-white px-4 py-3 rounded-lg mb-6">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Phone Number</label>
              <input key="login-phone" type="tel" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleInputChange}
                placeholder="Enter your phone number" required autoComplete="tel" data-form-type="other" data-lpignore="true" data-1p-ignore="true"
                className="w-full px-4 py-4 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" suppressHydrationWarning />
            </div>
            <div>
              <label className="block text-[#B3B3B3] text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input key="login-password" type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={handleInputChange}
                  placeholder="Enter your password" required autoComplete="current-password" data-form-type="other" data-lpignore="true" data-1p-ignore="true"
                  className="w-full px-4 py-4 pr-14 bg-[#3A3A3A] border-4 border-[#6A0DAD] rounded-lg text-[#EFEFEF] focus:outline-none focus:border-[#8B2CAD] transition-all placeholder:text-gray-500" suppressHydrationWarning />
                <button type="button" onClick={() => setShowPassword(!showPassword)} suppressHydrationWarning
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors select-none">
                  <i suppressHydrationWarning className={`fi ${showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-xl`} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-5 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg text-xl font-bold hover:bg-[#8B2CAD] transform hover:-translate-y-1 transition-all shadow-lg hover:shadow-[#6A0DAD]/40 disabled:opacity-60 disabled:cursor-not-allowed" suppressHydrationWarning>
              {loading ? 'Logging In...' : 'Log In'}
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
