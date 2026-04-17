'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string
  phone_number: string
  parent_name: string | null
  parent_phone_number: string | null
  role: string
  created_at: string
  is_banned: boolean
  grade: string | null
  email: string | null
}

interface Enrollment {
  id: string
  enrolled_at: string
  completed: boolean
  progress_percentage: number
  courses: {
    id: string
    title: string
    thumbnail_url: string | null
  } | null
}

interface QuizSubmission {
  id: string
  score: number
  total: number
  submitted_at: string
  quizzes: {
    id: string
    title: string
    modules: {
      id: string
      title: string
      courses: {
        id: string
        title: string
      } | null
    } | null
  } | null
}

interface ExamSubmission {
  id: string
  score: number
  total: number
  submitted_at: string
  module_exams: {
    id: string
    title: string
    modules: {
      id: string
      title: string
      courses: {
        id: string
        title: string
      } | null
    } | null
  } | null
}

interface WalletTransaction {
  id: string
  amount: number
  type: 'top_up' | 'purchase' | 'refund'
  description: string | null
  created_at: string
  courses: { title: string } | null
}

interface VideoProgress {
  video_id: string
  last_position: number
  completed: boolean
  last_watched_at: string
  videos: {
    id: string
    title: string
    duration: number | null
    order_index: number
    modules: {
      id: string
      title: string
      courses: {
        id: string
        title: string
      } | null
    } | null
  } | null
}

interface DeviceSession {
  id: string
  device_id: string
  device_name: string | null
  ip_address: string | null
  city: string | null
  country: string | null
  last_seen: string
  created_at: string
}

const gradeLabels: Record<string, string> = {
  prep_1: 'الأول إعدادي',
  prep_2: 'الثاني إعدادي',
  prep_3: 'الثالث إعدادي',
  sec_1: 'الأول ثانوي',
  sec_2: 'الثاني ثانوي',
  sec_3: 'الثالث ثانوي',
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  if (!total) return <span className="text-theme-muted text-sm">—</span>
  const pct = Math.round((score / total) * 100)
  const color =
    pct >= 80
      ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
      : pct >= 60
      ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
      : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      {score}/{total} — {pct}%
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)',
          }}
        />
      </div>
      <span className="text-xs text-theme-secondary font-semibold w-10 text-left">{value}%</span>
    </div>
  )
}

// ── Wallet top-up modal ───────────────────────────────────────────────────────
function WalletTopUpModal({
  userId,
  userName,
  currentBalance,
  onSuccess,
  onClose,
}: {
  userId: string
  userName: string
  currentBalance: number
  onSuccess: (newBalance: number) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const presets = [50, 100, 150, 200, 300, 500]

  const handleSubmit = async () => {
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) { setMsg({ type: 'error', text: 'أدخل مبلغ صحيح' }); return }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/admin/users/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: parsed, description: description.trim() || undefined }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setMsg({ type: 'success', text: `✓ تم إضافة ${parsed} جنيه — الرصيد الجديد: ${data.balance} جنيه` })
      onSuccess(data.balance)
      setAmount('')
      setDescription('')
    } else {
      setMsg({ type: 'error', text: data.error || 'فشل شحن المحفظة' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-[var(--border-color)] w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-theme-primary mb-1">👛 شحن المحفظة</h2>
        <p className="text-theme-secondary text-sm mb-5">
          إضافة رصيد لمحفظة <span className="text-theme-primary font-semibold">{userName}</span>
          <span className="text-theme-muted"> — رصيد حالي: </span>
          <span className="text-primary font-bold">{currentBalance} جنيه</span>
        </p>

        <p className="text-theme-secondary text-xs font-bold uppercase mb-2">مبالغ سريعة</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                amount === String(p)
                  ? 'text-white border-transparent'
                  : 'bg-[var(--bg-card-alt)] border-[var(--border-color)] text-theme-secondary hover:border-primary hover:text-theme-primary'
              }`}
              style={amount === String(p) ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}
            >
              {p} جنيه
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-theme-secondary text-xs font-bold mb-1.5">مبلغ مخصص (جنيه)</label>
          <input
            type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="مثال: 250"
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors text-lg font-bold text-center"
          />
        </div>

        <div className="mb-4">
          <label className="block text-theme-secondary text-xs font-bold mb-1.5">طريقة الدفع / ملاحظة (اختياري)</label>
          <input
            type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="مثال: كاش في المركز / فودافون كاش"
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors"
          />
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border ${
            msg.type === 'success' ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-300' : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
          }`}>{msg.text}</div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={!amount || loading}
            className="flex-1 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
            {loading ? 'جاري الشحن...' : `شحن ${amount ? amount + ' جنيه' : ''}`}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-all border border-[var(--border-color)]">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Devices Tab ───────────────────────────────────────────────────────────────
function DevicesTab({ userId, userName }: { userId: string; userName: string }) {
  const [devices, setDevices] = useState<DeviceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users/devices?userId=${userId}`)
    const data = await res.json()
    setDevices(data.devices || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  const handleDisconnectOne = async (deviceId: string) => {
    setActionLoading(deviceId)
    const res = await fetch('/api/admin/users/devices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deviceId }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (data.success) {
      showToast('success', 'تم قطع اتصال الجهاز. تم تحرير المقعد.')
      fetchDevices()
    } else {
      showToast('error', data.error || 'فشل قطع الاتصال')
    }
  }

  const handleClearAll = async () => {
    setActionLoading('all')
    const res = await fetch('/api/admin/users/devices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    setActionLoading(null)
    setConfirmClearAll(false)
    if (data.success) {
      // Full force sign-out: auth sessions + device records all deleted
      showToast('success', 'تم تسجيل خروج المستخدم من كل الأجهزة فوراً. يجب عليه تسجيل الدخول مجدداً.')
      fetchDevices()
    } else {
      showToast('error', data.error || 'فشل تسجيل الخروج')
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border ${
          toast.type === 'success' ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-300' : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.text}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-theme-secondary uppercase tracking-wider">الأجهزة المسجلة</h3>
          <p className="text-theme-muted text-xs mt-0.5">
            {loading ? '...' : `${devices.length} جهاز من أصل 2 مسموح`}
          </p>
        </div>
        {devices.length > 0 && (
          <button
            onClick={() => setConfirmClearAll(true)}
            disabled={actionLoading === 'all'}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading === 'all' ? <span className="animate-spin">⏳</span> : <span>🔌</span>}
            تسجيل خروج إجباري
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-theme-secondary animate-pulse">جاري التحميل...</div>
      ) : devices.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-theme-muted font-semibold">لا يوجد أجهزة مسجلة</p>
          <p className="text-theme-muted text-xs mt-1">يمكن للمستخدم الدخول من ٢ جهاز جديد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device, index) => (
            <div
              key={device.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-alt)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0"
                    style={{ background: index === 0 ? 'linear-gradient(135deg,#FD1D1D,#FCB045)' : 'rgba(255,255,255,0.1)' }}
                  >
                    {device.device_name?.includes('Android') || device.device_name?.includes('iPhone') || device.device_name?.includes('iPad') ? '📱' : '💻'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-theme-primary font-bold text-sm">
                        {device.device_name || 'جهاز غير معروف'}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                          الأول
                        </span>
                      )}
                    </div>

                    {(device.city || device.country) && (
                      <p className="text-theme-secondary text-xs mb-0.5 flex items-center gap-1">
                        <span>📍</span>
                        {[device.city, device.country].filter(Boolean).join('، ')}
                      </p>
                    )}

                    {device.ip_address && (
                      <p className="text-theme-muted text-xs mb-0.5 flex items-center gap-1">
                        <span>🌐</span>
                        {device.ip_address}
                      </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      <p className="text-theme-muted text-xs flex items-center gap-1">
                        <span>📅</span>
                        مسجل: {new Date(device.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-theme-muted text-xs flex items-center gap-1">
                        <span>🕐</span>
                        آخر نشاط: {new Date(device.last_seen).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Disconnect one device — only frees the slot, doesn't kill auth session */}
                <button
                  onClick={() => handleDisconnectOne(device.device_id)}
                  disabled={actionLoading === device.device_id}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-700 dark:text-orange-400 border border-orange-500/30 transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {actionLoading === device.device_id ? '...' : '✕ إزالة'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Force Sign-Out Modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-blue-500/40 w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">🔌 تسجيل خروج إجباري</h2>
            <p className="text-theme-secondary text-sm mb-4">
              هل تريد تسجيل خروج <span className="text-theme-primary font-bold">{userName}</span> من كل الأجهزة فوراً؟
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 mb-6">
              <ul className="text-blue-600/80 dark:text-blue-400/80 text-xs space-y-1">
                <li>• سيتم حذف كل جلسات تسجيل الدخول من قاعدة البيانات <strong>فوراً</strong></li>
                <li>• الكوكيز المحفوظة في المتصفح ستصبح غير صالحة في الطلب التالي</li>
                <li>• سيتم مسح سجل الأجهزة كذلك</li>
                <li>• يمكنه بعدها تسجيل الدخول من أجهزة جديدة (حتى ٢ جهاز)</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                disabled={actionLoading === 'all'}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {actionLoading === 'all' ? 'جاري تسجيل الخروج...' : '✓ نعم، سجّل الخروج'}
              </button>
              <button
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 py-3 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-all border border-[var(--border-color)]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([])
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([])
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'courses' | 'quizzes' | 'exams' | 'videos' | 'wallet' | 'devices'>('courses')

  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setProfile(data.profile)
        setEnrollments(data.enrollments)
        setQuizSubmissions(data.quizSubmissions)
        setExamSubmissions(data.examSubmissions)
        setVideoProgress(data.videoProgress || [])
      })
      .catch(() => setError('فشل تحميل بيانات المستخدم'))
      .finally(() => setLoading(false))
  }, [userId])

  const fetchWallet = useCallback(async () => {
    if (!userId) return
    setWalletLoading(true)
    const res = await fetch(`/api/admin/users/wallet?userId=${userId}`)
    const data = await res.json()
    setWalletBalance(Number(data.balance ?? 0))
    setWalletTransactions(data.transactions ?? [])
    setWalletLoading(false)
  }, [userId])

  useEffect(() => {
    if (activeTab === 'wallet') fetchWallet()
  }, [activeTab, fetchWallet])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-theme-secondary">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg font-bold mb-4">{error || 'المستخدم غير موجود'}</p>
          <Link href="/admin/users" className="text-primary hover:underline">← العودة لإدارة المستخدمين</Link>
        </div>
      </div>
    )
  }

  const avgQuizScore = quizSubmissions.length
    ? Math.round(quizSubmissions.reduce((acc, q) => acc + (q.total ? (q.score / q.total) * 100 : 0), 0) / quizSubmissions.length)
    : null
  const avgExamScore = examSubmissions.length
    ? Math.round(examSubmissions.reduce((acc, e) => acc + (e.total ? (e.score / e.total) * 100 : 0), 0) / examSubmissions.length)
    : null

  const txTypeLabel: Record<string, string> = {
    top_up: '⬆️ شحن',
    purchase: '🛒 شراء',
    refund: '↩️ استرداد',
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-6 transition-colors text-sm font-semibold">
        ← العودة
      </Link>

      {/* Header Card */}
      <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden mb-6">
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }} />
        <div className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)' }}
            >
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-theme-primary">{profile.full_name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  profile.is_banned ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
                }`}>{profile.is_banned ? 'محظور' : 'نشيط'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">{profile.role}</span>
                {profile.grade && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30">
                    {gradeLabels[profile.grade] || profile.grade}
                  </span>
                )}
              </div>
              <p className="text-theme-secondary text-sm">
                انضم في {new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-5">
          <h2 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-4 flex items-center gap-2"><span>👤</span> بيانات الطالب</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">الاسم الكامل</span>
              <span className="text-theme-primary font-semibold">{profile.full_name}</span>
            </div>
            <div className="h-px bg-[var(--border-color)]" />
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">رقم الهاتف</span>
              <a href={`tel:${profile.phone_number}`} className="text-primary font-mono font-semibold hover:underline">{profile.phone_number}</a>
            </div>
            {profile.email && (
              <>
                <div className="h-px bg-[var(--border-color)]" />
                <div className="flex items-center justify-between">
                  <span className="text-theme-secondary text-sm">البريد الإلكتروني</span>
                  <span className="text-theme-primary text-sm font-semibold truncate max-w-[200px]">{profile.email}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-5">
          <h2 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-4 flex items-center gap-2"><span>👨‍👩‍👦</span> بيانات ولي الأمر</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">اسم ولي الأمر</span>
              <span className="text-theme-primary font-semibold">{profile.parent_name || <span className="text-theme-muted italic text-sm">غير محدد</span>}</span>
            </div>
            <div className="h-px bg-[var(--border-color)]" />
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">رقم ولي الأمر</span>
              {profile.parent_phone_number ? (
                <a href={`tel:${profile.parent_phone_number}`} className="text-primary font-mono font-semibold hover:underline">{profile.parent_phone_number}</a>
              ) : (
                <span className="text-theme-muted italic text-sm">غير محدد</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black text-theme-primary">{enrollments.length}</p>
          <p className="text-theme-secondary text-xs mt-1">كورس مسجل</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black text-theme-primary">{enrollments.filter(e => e.completed).length}</p>
          <p className="text-theme-secondary text-xs mt-1">كورس مكتمل</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black" style={avgQuizScore !== null ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
            {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
          </p>
          <p className="text-theme-secondary text-xs mt-1">متوسط الكويزات</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black" style={avgExamScore !== null ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
            {avgExamScore !== null ? `${avgExamScore}%` : '—'}
          </p>
          <p className="text-theme-secondary text-xs mt-1">متوسط الامتحانات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex border-b border-[var(--border-color)] overflow-x-auto">
          {([
            { key: 'courses', label: 'الكورسات', icon: '📚', count: enrollments.length },
            { key: 'quizzes', label: 'الكويزات', icon: '📝', count: quizSubmissions.length },
            { key: 'exams', label: 'الامتحانات', icon: '📋', count: examSubmissions.length },
            { key: 'wallet', label: 'المحفظة', icon: '👛', count: null },
            { key: 'devices', label: 'الأجهزة', icon: '📱', count: null },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 px-3 text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.key ? 'text-white' : 'text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)]'
              }`}
              style={activeTab === tab.key ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[var(--border-color)] text-theme-secondary'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            enrollments.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد كورسات مسجلة</div>
            ) : (
              <div className="space-y-3">
                {enrollments.map(enrollment => (
                  <div key={enrollment.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">📚</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">{enrollment.courses?.title || 'كورس محذوف'}</p>
                      <p className="text-theme-secondary text-xs mt-0.5">تسجيل {new Date(enrollment.enrolled_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ProgressBar value={enrollment.progress_percentage ?? 0} />
                      {enrollment.completed && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">✓ مكتمل</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
            quizSubmissions.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد كويزات مقدمة</div>
            ) : (
              <div className="space-y-3">
                {quizSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">📝</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">{sub.quizzes?.title || 'كويز محذوف'}</p>
                      <p className="text-theme-secondary text-xs mt-0.5">
                        {sub.quizzes?.modules?.courses?.title && <span className="font-medium">{sub.quizzes.modules.courses.title} ← </span>}
                        {sub.quizzes?.modules?.title}
                      </p>
                      <p className="text-theme-muted text-xs">{new Date(sub.submitted_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <ScoreBadge score={sub.score} total={sub.total} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            examSubmissions.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد امتحانات مقدمة</div>
            ) : (
              <div className="space-y-3">
                {examSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">📋</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">{sub.module_exams?.title || 'امتحان محذوف'}</p>
                      <p className="text-theme-secondary text-xs mt-0.5">
                        {sub.module_exams?.modules?.courses?.title && <span className="font-medium">{sub.module_exams.modules.courses.title} ← </span>}
                        {sub.module_exams?.modules?.title}
                      </p>
                      <p className="text-theme-muted text-xs">{new Date(sub.submitted_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <ScoreBadge score={sub.score} total={sub.total} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div>
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex-1 rounded-2xl p-5 text-white min-w-[200px]" style={{ background: 'linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)' }}>
                  <p className="text-white/70 text-sm font-semibold mb-1">رصيد المحفظة الحالي</p>
                  <p className="text-4xl font-black">{walletLoading ? '...' : `${walletBalance} جنيه`}</p>
                </div>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="px-6 py-4 text-white font-bold rounded-2xl transition-all hover:opacity-90 flex items-center gap-2 text-lg shadow-lg"
                  style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}
                >
                  ＋ شحن المحفظة
                </button>
              </div>

              <h3 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-3">سجل المعاملات</h3>
              {walletLoading ? (
                <div className="py-8 text-center text-theme-secondary animate-pulse">جاري التحميل...</div>
              ) : walletTransactions.length === 0 ? (
                <div className="py-12 text-center text-theme-muted">لا يوجد معاملات بعد</div>
              ) : (
                <div className="space-y-2">
                  {walletTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${tx.type === 'top_up' ? 'bg-green-500/20' : tx.type === 'purchase' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                        {tx.type === 'top_up' ? '⬆️' : tx.type === 'purchase' ? '🛒' : '↩️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-theme-primary font-semibold text-sm truncate">{tx.description || txTypeLabel[tx.type]}</p>
                        {tx.courses && <p className="text-theme-secondary text-xs truncate">{(tx.courses as any).title}</p>}
                        <p className="text-theme-muted text-xs">{new Date(tx.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-lg font-black flex-shrink-0 ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} جنيه
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && profile && (
            <DevicesTab userId={profile.id} userName={profile.full_name} />
          )}
        </div>
      </div>

      {/* Wallet Top-Up Modal */}
      {showTopUpModal && profile && (
        <WalletTopUpModal
          userId={profile.id}
          userName={profile.full_name}
          currentBalance={walletBalance}
          onSuccess={(newBalance) => { setWalletBalance(newBalance); fetchWallet() }}
          onClose={() => setShowTopUpModal(false)}
        />
      )}
    </div>
  )
}
