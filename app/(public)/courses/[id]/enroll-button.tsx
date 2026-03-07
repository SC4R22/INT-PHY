'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
    if (!isLoggedIn) { router.push('/login'); return }
    if (isFree) {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }) })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'فشل الاشتراك.'); toast.error(data.error || 'فشل الاشتراك.'); setLoading(false); return }
        setSuccess(true)
        toast.success(data.alreadyEnrolled ? 'مشترك بالفعل! جاري التحويل...' : `تم اشتراكك في ${courseTitle}!`)
        setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1500)
      } catch (err: any) { setError(err.message || 'حدث خطأ ما.'); setLoading(false) }
      return
    }
    setShowModal(true)
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('يجب تسجيل الدخول أولاً.'); setLoading(false); return }
      const { data, error: rpcError } = await supabase.rpc('redeem_access_code', { p_code: code.trim().toUpperCase(), p_user_id: user.id })
      if (rpcError) { setError(rpcError.message); setLoading(false); return }
      const result = data as { success: boolean; error?: string }
      if (!result.success) { const msg = result.error || 'كود غير صحيح أو مستخدم مسبقاً.'; setError(msg); toast.error(msg); setLoading(false); return }
      setSuccess(true); toast.success(`تم اشتراكك في ${courseTitle}!`); setLoading(false)
      setTimeout(() => { setShowModal(false); router.push('/dashboard'); router.refresh() }, 2000)
    } catch (err: any) { setError(err.message || 'حدث خطأ ما.'); setLoading(false) }
  }

  if (isEnrolled) return (
    <div className="space-y-3">
      <div className="w-full py-4 bg-green-500/20 border-2 border-green-500 text-green-400 rounded-xl font-bold text-center text-lg">✓ مشترك</div>
      <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all">اذهب للداشبورد ←</button>
    </div>
  )

  if (success && isFree) return (
    <div className="w-full py-4 bg-green-500/20 border-2 border-green-500 text-green-400 rounded-xl font-bold text-center text-lg">🎉 تم الاشتراك! جاري التحويل...</div>
  )

  return (
    <>
      {error && !showModal && <div className="mb-3 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">{error}</div>}
      <button onClick={handleEnrollClick} disabled={loading}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
        {loading ? 'جاري الاشتراك...' : isLoggedIn ? (isFree ? 'اشترك مجاناً' : 'استخدام كود الدخول') : 'سجل دخول للاشتراك'}
      </button>
      {!isLoggedIn && <p className="text-center text-theme-secondary text-xs mt-3">ماعندكش حساب؟ <a href="/signup" className="text-primary hover:underline font-semibold">سجل مجاناً</a></p>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && setShowModal(false)} />
          <div className="relative bg-theme-card border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 w-full max-w-md p-8 z-10">
            <button onClick={() => !loading && setShowModal(false)} className="absolute top-4 right-4 text-theme-secondary hover:text-theme-primary text-xl font-bold transition-colors">✕</button>
            {success ? (
              <div className="text-center py-4"><div className="text-6xl mb-4">🎉</div><h3 className="text-2xl font-payback font-bold text-theme-primary mb-2">تم الاشتراك!</h3><p className="text-theme-secondary">جاري تحويلك للداشبورد...</p></div>
            ) : (
              <>
                <div className="mb-6"><h3 className="text-2xl font-payback font-bold text-theme-primary mb-1">🎟️ استخدام كود الدخول</h3><p className="text-theme-secondary text-sm">ادخل الكود الخاص بك لكورس <strong className="text-theme-primary">{courseTitle}</strong></p></div>
                {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">{error}</div>}
                <form onSubmit={handleRedeem} className="space-y-4">
                  <div>
                    <label className="block text-theme-secondary text-xs font-bold mb-2 uppercase tracking-wider">كود الدخول</label>
                    <input type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(null) }} placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-4 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none font-mono text-lg tracking-widest text-center placeholder:text-theme-muted placeholder:tracking-normal placeholder:font-sans transition-colors"
                      maxLength={14} disabled={loading} autoFocus />
                  </div>
                  <button type="submit" disabled={loading || !code.trim()} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                    {loading ? 'جاري التحقق...' : 'تفعيل واشتراك'}
                  </button>
                  <p className="text-center text-theme-secondary text-xs">اشتري كود الدخول من الأستاذ أحمد أو في أي مركز</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
