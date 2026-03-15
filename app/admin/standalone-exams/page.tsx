/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function StandaloneExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/standalone-exams')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setExams(json.exams ?? [])
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchExams() }, [fetchExams])

  const createExam = async () => {
    if (!newTitle.trim()) return
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/admin/standalone-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', title: newTitle.trim(), description: newDesc.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setNewTitle(''); setNewDesc(''); setShowForm(false); fetchExams()
    } catch (e: any) { setError(e.message) }
    setCreating(false)
  }

  const togglePublish = async (examId: string, published: boolean) => {
    try {
      const res = await fetch('/api/admin/standalone-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'togglePublish', examId, published: !published }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      fetchExams()
    } catch (e: any) { setError(e.message) }
  }

  const deleteExam = async (examId: string) => {
    if (!confirm('حذف هذا الامتحان وكل أسئلته؟')) return
    try {
      const res = await fetch('/api/admin/standalone-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', examId }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      fetchExams()
    } catch (e: any) { setError(e.message) }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-theme-secondary text-xl animate-pulse">جاري التحميل...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-1">الامتحانات المستقلة</h1>
          <p className="text-theme-secondary text-sm">امتحانات خارج الكورسات — متاحة لكل الطلاب</p>
        </div>
        <button suppressHydrationWarning onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-500 transition-all whitespace-nowrap">
          {showForm ? '✕ إلغاء' : '+ امتحان جديد'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>}

      {showForm && (
        <div className="bg-theme-card rounded-xl border-2 border-yellow-600/50 p-5 mb-6">
          <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">📋 إنشاء امتحان جديد</p>
          <div className="space-y-3">
            <input type="text" placeholder="عنوان الامتحان *" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-yellow-500 rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted" />
            <textarea placeholder="وصف الامتحان (اختياري)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-yellow-500 rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted resize-none" />
            <div className="flex gap-2">
              <button suppressHydrationWarning onClick={createExam} disabled={creating || !newTitle.trim()}
                className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">
                {creating ? 'جاري الإنشاء...' : '✓ إنشاء'}
              </button>
              <button suppressHydrationWarning onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)] transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-theme-primary text-xl font-bold mb-2">مفيش امتحانات بعد</p>
          <p className="text-theme-secondary text-sm">اضغط "+ امتحان جديد" لإنشاء أول امتحان</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam: any) => (
            <div key={exam.id} className={`bg-theme-card rounded-xl border-2 p-5 ${exam.published ? 'border-yellow-600/50' : 'border-[var(--border-color)]'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-theme-primary font-bold text-base">{exam.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${exam.published ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-[var(--bg-card-alt)] text-theme-secondary border-[var(--border-color)]'}`}>
                      {exam.published ? '✓ منشور' : 'مسودة'}
                    </span>
                    <span className="text-theme-secondary text-xs">{exam.questionCount || 0} سؤال</span>
                  </div>
                  {exam.description && <p className="text-theme-secondary text-sm line-clamp-1">{exam.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <Link href={`/admin/standalone-exams/${exam.id}`}
                    className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/80 transition-all whitespace-nowrap">
                    ✏️ إدارة الأسئلة
                  </Link>
                  <button suppressHydrationWarning onClick={() => togglePublish(exam.id, exam.published)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${exam.published ? 'bg-[var(--bg-card-alt)] text-theme-secondary hover:bg-[var(--border-color)]' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>
                    {exam.published ? '⬇ إلغاء النشر' : '⬆ نشر'}
                  </button>
                  <button suppressHydrationWarning onClick={() => deleteExam(exam.id)}
                    className="px-3 py-2 bg-red-600/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-600/50 transition-all">حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
