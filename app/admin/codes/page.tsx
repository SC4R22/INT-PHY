'use client'

import { useState, useEffect, useCallback } from 'react'
import { generateAccessCodes, deleteAccessCode } from '@/app/actions/access-codes'

interface Course { id: string; title: string }
interface AccessCode {
  id: string; code: string; course_id: string; is_used: boolean; created_at: string; expires_at: string | null
  course: { title: string } | null
  used_by_profile: { full_name: string; phone_number: string } | null
}

export default function AccessCodesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [genForm, setGenForm] = useState({ course_id: '', quantity: '1', expires_in_days: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/codes')
    const json = await res.json()
    setCourses(json.courses || [])
    setCodes(json.codes || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genForm.course_id) { setError('من فضلك اختر كورسا'); return }
    setGenerating(true); setError(null); setSuccess(null)
    const quantity = Math.min(parseInt(genForm.quantity) || 1, 100)
    const expiresInDays = genForm.expires_in_days ? parseInt(genForm.expires_in_days) : undefined
    const result = await generateAccessCodes(genForm.course_id, quantity, expiresInDays)
    if (!result.success) { setError(result.error || 'فشل توليد الأكواد'); setGenerating(false); return }
    setSuccess(`✓ تم توليد ${quantity} كود بنجاح`)
    setGenerating(false); fetchData()
    setTimeout(() => setSuccess(null), 4000)
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteCode = async (id: string) => {
    if (!confirm('حذف هذا الكود غير المستخدم؟')) return
    const result = await deleteAccessCode(id)
    if (!result.success) { setError(result.error || 'فشل حذف الكود'); return }
    fetchData()
  }

  const filteredCodes = codes.filter(c => {
    const courseMatch = filterCourse === 'all' || c.course_id === filterCourse
    const isExpired = c.expires_at && new Date(c.expires_at) < new Date()
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'available' && !c.is_used && !isExpired) ||
      (filterStatus === 'used' && c.is_used) ||
      (filterStatus === 'expired' && isExpired && !c.is_used)
    return courseMatch && statusMatch
  })

  const stats = {
    total: codes.length,
    available: codes.filter(c => !c.is_used && !(c.expires_at && new Date(c.expires_at) < new Date())).length,
    used: codes.filter(c => c.is_used).length,
    expired: codes.filter(c => !c.is_used && c.expires_at && new Date(c.expires_at) < new Date()).length,
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">أكواد الدخول</h1>
        <p className="text-theme-secondary">توليد وإدارة أكواد التسجيل للطلاب</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'إجمالي الأكواد', value: stats.total, border: 'border-primary', text: 'text-theme-primary' },
          { label: 'متاح', value: stats.available, border: 'border-green-500', text: 'text-green-600 dark:text-green-400' },
          { label: 'مستخدم', value: stats.used, border: 'border-primary', text: 'text-primary' },
          { label: 'منتهي', value: stats.expired, border: 'border-red-500', text: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-theme-card rounded-lg p-4 border-l-4 ${s.border}`}>
            <p className="text-theme-secondary text-sm">{s.label}</p>
            <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Generate form */}
      <div className="bg-theme-card rounded-xl p-6 mb-8 border-2 border-primary">
        <h2 className="text-xl font-bold text-theme-primary mb-4">🎟️ توليد أكواد جديدة</h2>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm font-semibold">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-700 dark:text-green-400 text-sm font-semibold">{success}</div>}

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-theme-secondary text-xs font-bold mb-1 uppercase tracking-wider">الكورس *</label>
            <select value={genForm.course_id} onChange={e => setGenForm(p => ({ ...p, course_id: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none">
              <option value="">اختر كورس...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-theme-secondary text-xs font-bold mb-1 uppercase tracking-wider">الكمية (أقصى 100)</label>
            <input type="number" min="1" max="100" value={genForm.quantity}
              onChange={e => setGenForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none" />
          </div>
          <div>
            <label className="block text-theme-secondary text-xs font-bold mb-1 uppercase tracking-wider">تنتهي خلال (أيام)</label>
            <input type="number" min="1" placeholder="لا تنتهي" value={genForm.expires_in_days}
              onChange={e => setGenForm(p => ({ ...p, expires_in_days: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none placeholder:text-theme-muted" />
          </div>
          <div className="md:col-span-4">
            <button type="submit" disabled={generating}
              className="px-8 py-3 text-white font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
              {generating ? 'جاري التوليد...' : `توليد ${genForm.quantity || 1} كود`}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-lg text-theme-primary text-sm outline-none focus:border-primary">
          <option value="all">كل الكورسات</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] rounded-lg text-theme-primary text-sm outline-none focus:border-primary">
          <option value="all">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="used">مستخدم</option>
          <option value="expired">منتهي</option>
        </select>
        <span className="px-3 py-2 text-theme-secondary text-sm">يظهر {filteredCodes.length} كود</span>
      </div>

      {/* Codes table */}
      <div className="bg-theme-card rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
              <tr>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الكود</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الكورس</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الحالة</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">استخدمه</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">ينتهي</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">تاريخ الإنشاء</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-theme-secondary animate-pulse">جاري التحميل...</td></tr>
              ) : filteredCodes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-theme-secondary">لا توجد أكواد</td></tr>
              ) : filteredCodes.map(code => {
                const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
                const status = code.is_used ? 'used' : isExpired ? 'expired' : 'available'
                return (
                  <tr key={code.id} className="hover:bg-[var(--bg-card-alt)] transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-theme-primary font-bold tracking-widest text-sm">{code.code}</span>
                    </td>
                    <td className="px-6 py-3 text-theme-secondary text-sm">{code.course?.title || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        status === 'available' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                        status === 'used' ? 'bg-primary/20 text-primary' :
                        'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {status === 'available' ? 'متاح' : status === 'used' ? 'مستخدم' : 'منتهي'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-theme-secondary text-sm">
                      {code.used_by_profile ? `${code.used_by_profile.full_name} (${code.used_by_profile.phone_number})` : '—'}
                    </td>
                    <td className="px-6 py-3 text-theme-secondary text-sm">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'لا تنتهي'}
                    </td>
                    <td className="px-6 py-3 text-theme-secondary text-sm">
                      {new Date(code.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        {!code.is_used && (
                          <button onClick={() => copyCode(code.code, code.id)}
                            className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold rounded transition-colors">
                            {copiedId === code.id ? '✓ تم النسخ' : 'نسخ'}
                          </button>
                        )}
                        {!code.is_used && (
                          <button onClick={() => deleteCode(code.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-500/30 transition-colors">
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
