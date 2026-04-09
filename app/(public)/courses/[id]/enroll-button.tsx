'use client'

import { useState, useEffect } from 'react'
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
  const [activeTab, setActiveTab] = useState<'code' | 'wallet'>('code')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [coursePrice, setCoursePrice] = useState<number | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)

  // Fetch wallet info when modal opens
  useEffect(() => {
    if (!showModal || isFree || !isLoggedIn) return
    fetch(`/api/wallet?courseId=${courseId}`)
      .then(r => r.json())
      .then(d => {
        setWalletBalance(d.balance ?? 0)
        setCoursePrice(d.price ?? 0)
      })
      .catch(() => {})
  }, [showModal, courseId, isFree, isLoggedIn])

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

  const handleWalletPurchase = async () => {
    setWalletLoading(true); setError(null)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        const msg = data.error || 'فشل الشراء بالمحفظة.'
        setError(msg); toast.error(msg); setWalletLoading(false); return
      }
      setSuccess(true); toast.success(`تم اشتراكك في ${courseTitle}!`)
      setTimeout(() => { setShowModal(false); router.push('/dashboard'); router.refresh() }, 2000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما.'); setWalletLoading(false)
    }
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

  const canAffordWallet =
    walletBalance !== null && coursePrice !== null && walletBalance >= coursePrice

  return (
    <>
      {error && !showModal && <div className="mb-3 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">{error}</div>}
      <button onClick={handleEnrollClick} disabled={loading}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
        {loading ? 'جاري الاشتراك...' : isLoggedIn ? (isFree ? 'اشترك مجاناً' : 'اشترك الآن') : 'سجل دخول للاشتراك'}
      </button>
      {!isLoggedIn && <p className="text-center text-theme-secondary text-xs mt-3">ماعندكش حساب؟ <a href="/signup" className="text-primary hover:underline font-semibold">سجل مجاناً</a></p>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && !walletLoading && setShowModal(false)} />
          <div className="relative bg-theme-card border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 w-full max-w-md p-8 z-10">
            <button
              onClick={() => !loading && !walletLoading && setShowModal(false)}
              className="absolute top-4 right-4 text-theme-secondary hover:text-theme-primary text-xl font-bold transition-colors"
            >✕</button>

            {success ? (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-payback font-bold text-theme-primary mb-2">تم الاشتراك!</h3>
                <p className="text-theme-secondary">جاري تحويلك للداشبورد...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-payback font-bold text-theme-primary mb-1">🎓 الاشتراك في الكورس</h3>
                  <p className="text-theme-secondary text-sm">
                    اختر طريقة الدفع لـ <strong className="text-theme-primary">{courseTitle}</strong>
                    {coursePrice !== null && (
                      <span className="text-primary font-bold"> — {coursePrice} جنيه</span>
                    )}
                  </p>
                </div>

                {/* Tab switcher */}
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-color)] mb-6">
                  <button
                    onClick={() => { setActiveTab('code'); setError(null) }}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${
                      activeTab === 'code'
                        ? 'text-white'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                    style={activeTab === 'code' ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}
                  >
                    🎟️ كود الدخول
                  </button>
                  <button
                    onClick={() => { setActiveTab('wallet'); setError(null) }}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${
                      activeTab === 'wallet'
                        ? 'text-white'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                    style={activeTab === 'wallet' ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}
                  >
                    👛 المحفظة
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">{error}</div>
                )}

                {/* Code tab */}
                {activeTab === 'code' && (
                  <form onSubmit={handleRedeem} className="space-y-4">
                    <div>
                      <label className="block text-theme-secondary text-xs font-bold mb-2 uppercase tracking-wider">كود الدخول</label>
                      <input
                        type="text"
                        value={code}
                        onChange={e => { setCode(e.target.value.toUpperCase()); setError(null) }}
                        placeholder="XXXX-XXXX-XXXX"
                        className="w-full px-4 py-4 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none font-mono text-lg tracking-widest text-center placeholder:text-theme-muted placeholder:tracking-normal placeholder:font-sans transition-colors"
                        maxLength={14} disabled={loading} autoFocus
                      />
                    </div>
                    <button type="submit" disabled={loading || !code.trim()}
                      className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                      {loading ? 'جاري التحقق...' : 'تفعيل واشتراك'}
                    </button>
                    <p className="text-center text-theme-secondary text-xs">اشتري كود الدخول من الأستاذ أحمد أو في أي مركز</p>
                  </form>
                )}

                {/* Wallet tab */}
                {activeTab === 'wallet' && (
                  <div className="space-y-4">
                    <div className="bg-[var(--bg-card-alt)] border border-[var(--border-color)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-theme-secondary text-sm">رصيد محفظتك</span>
                        <span className={`text-2xl font-bold ${canAffordWallet ? 'text-green-400' : 'text-red-400'}`}>
                          {walletBalance !== null ? `${walletBalance} جنيه` : '...'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-theme-secondary text-sm">سعر الكورس</span>
                        <span className="text-theme-primary font-semibold">
                          {coursePrice !== null ? `${coursePrice} جنيه` : '...'}
                        </span>
                      </div>
                      {walletBalance !== null && coursePrice !== null && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                          <span className="text-theme-secondary text-sm">الرصيد بعد الشراء</span>
                          <span className={`font-bold ${canAffordWallet ? 'text-theme-primary' : 'text-red-400'}`}>
                            {canAffordWallet ? `${walletBalance - coursePrice} جنيه` : 'رصيد غير كافٍ'}
                          </span>
                        </div>
                      )}
                    </div>

                    {!canAffordWallet && walletBalance !== null && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm text-center">
                        💡 رصيدك غير كافٍ. تواصل مع الأستاذ لشحن المحفظة.
                      </div>
                    )}

                    <button
                      onClick={handleWalletPurchase}
                      disabled={walletLoading || !canAffordWallet || walletBalance === null}
                      className="w-full py-4 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}
                    >
                      {walletLoading ? 'جاري الشراء...' : `👛 ادفع ${coursePrice ?? '...'} جنيه من المحفظة`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
