'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  courseId: string
  courseTitle: string
  isFree: boolean
  isLoggedIn: boolean
  isEnrolled: boolean
}

export function EnrollButton({ courseId, courseTitle, isFree, isLoggedIn, isEnrolled }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleEnrollClick = async () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    // Free course: skip modal, enroll directly
    if (isFree) {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({ user_id: user.id, course_id: courseId })

        if (enrollError) {
          // Already enrolled — treat as success
          if (enrollError.message.includes('duplicate') || enrollError.message.includes('unique')) {
            setSuccess(true)
          } else {
            setError(enrollError.message)
            setLoading(false)
            return
          }
        } else {
          setSuccess(true)
        }

        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      } catch (err: any) {
        setError(err.message || 'Something went wrong.')
        setLoading(false)
      }
      return
    }

    // Paid course: open code modal
    setShowModal(true)
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be logged in.'); setLoading(false); return }

      // Use the atomic RPC — checks validity, marks used, creates enrollment in one transaction
      const { data, error: rpcError } = await supabase
        .rpc('redeem_access_code', {
          p_code: code.trim().toUpperCase(),
          p_user_id: user.id,
        })

      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }

      const result = data as { success: boolean; error?: string }

      if (!result.success) {
        setError(result.error || 'Invalid or already used code. Please check and try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        setShowModal(false)
        router.push('/dashboard')
        router.refresh()
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  // Already enrolled state
  if (isEnrolled) {
    return (
      <div className="space-y-3">
        <div className="w-full py-4 bg-green-500/20 border-2 border-green-500 text-green-400 rounded-xl font-bold text-center text-lg">
          ✓ Enrolled
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all"
        >
          Go to Dashboard →
        </button>
      </div>
    )
  }

  // Free course success state (shown inline, no modal)
  if (success && isFree) {
    return (
      <div className="w-full py-4 bg-green-500/20 border-2 border-green-500 text-green-400 rounded-xl font-bold text-center text-lg">
        🎉 Enrolled! Redirecting...
      </div>
    )
  }

  return (
    <>
      {error && !showModal && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">
          {error}
        </div>
      )}

      <button
        onClick={handleEnrollClick}
        disabled={loading}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {loading
          ? 'Enrolling...'
          : isLoggedIn
            ? (isFree ? 'Enroll for Free' : 'Redeem Access Code')
            : 'Log in to Enroll'}
      </button>

      {!isLoggedIn && (
        <p className="text-center text-[#B3B3B3] text-xs mt-3">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-primary hover:underline font-semibold">Sign up free</a>
        </p>
      )}

      {/* ── Modal (paid courses only) ───────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !loading && setShowModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-[#2A2A2A] border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 w-full max-w-md p-8 z-10">

            {/* Close */}
            <button
              onClick={() => !loading && setShowModal(false)}
              className="absolute top-4 right-4 text-[#B3B3B3] hover:text-[#EFEFEF] text-xl font-bold transition-colors"
            >
              ✕
            </button>

            {success ? (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-payback font-bold text-[#EFEFEF] mb-2">You&apos;re Enrolled!</h3>
                <p className="text-[#B3B3B3]">Redirecting you to your dashboard...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-payback font-bold text-[#EFEFEF] mb-1">
                    🎟️ Redeem Access Code
                  </h3>
                  <p className="text-[#B3B3B3] text-sm">
                    Enter the code you received for <strong className="text-[#EFEFEF]">{courseTitle}</strong>
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRedeem} className="space-y-4">
                  <div>
                    <label className="block text-[#B3B3B3] text-xs font-bold mb-2 uppercase tracking-wider">
                      Access Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => { setCode(e.target.value.toUpperCase()); setError(null) }}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-4 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-primary rounded-xl text-[#EFEFEF] outline-none font-mono text-lg tracking-widest text-center placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-sans transition-colors"
                      maxLength={14}
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? 'Verifying...' : 'Redeem & Enroll'}
                  </button>

                  <p className="text-center text-[#B3B3B3] text-xs">
                    Purchase your access code from Mr. Eslam or at any center
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
