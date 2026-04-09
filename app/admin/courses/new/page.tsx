'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

const GRADES = [
  { value: 'sec_1', label: 'ثانوي 1' },
  { value: 'sec_2', label: 'ثانوي 2' },
  { value: 'sec_3', label: 'ثانوي 3' },
]

export default function NewCoursePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price_cash: '',
    is_free: false,
    published: false,
    target_grade: '',
    thumbnail_url: '',
  })

  useEffect(() => {
    const grade = searchParams.get('grade')
    if (grade && GRADES.some(g => g.value === grade)) {
      setForm(prev => ({ ...prev, target_grade: grade }))
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price_cash: form.is_free ? 0 : parseFloat(form.price_cash) || 0,
          is_free: form.is_free,
          published: form.published,
          target_grade: form.target_grade || null,
          thumbnail_url: form.thumbnail_url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'فشل إنشاء الكورس'); setLoading(false); return }

      router.push(`/admin/courses/${json.course.id}/content`)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button suppressHydrationWarning onClick={() => router.push('/admin/courses')}
          className="text-theme-secondary hover:text-theme-primary flex items-center gap-2 mb-4 transition-colors">
          ← رجوع للكورسات
        </button>
        <h1 className="text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">إنشاء كورس جديد</h1>
        <p className="text-theme-secondary">أدخل تفاصيل الكورس الجديد</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg text-red-600 dark:text-red-400 font-semibold">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Thumbnail URL */}
        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-2 uppercase tracking-wider">صورة الكورس (رابط)</label>
          <input
            type="text"
            name="thumbnail_url"
            value={form.thumbnail_url}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors placeholder:text-theme-muted"
          />
          {form.thumbnail_url && (
            <div className="mt-4 relative rounded-xl overflow-hidden border border-[var(--border-color)]" style={{ aspectRatio: '16/9' }}>
              <Image
                src={form.thumbnail_url}
                alt="Thumbnail preview"
                fill
                className="object-cover"
                unoptimized
                onError={() => {}}
              />
            </div>
          )}
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-2 uppercase tracking-wider">عنوان الكورس *</label>
          <input
            type="text" name="title" value={form.title} onChange={handleChange} required
            placeholder="مثال: فيزياء الصف الأول الثانوي"
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors placeholder:text-theme-muted"
          />
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-2 uppercase tracking-wider">الوصف *</label>
          <textarea
            name="description" value={form.description} onChange={handleChange} required rows={4}
            placeholder="اوصف ما سيتعلمه الطلاب..."
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors placeholder:text-theme-muted resize-none"
          />
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">السعر</label>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <div dir="ltr" className={`w-12 h-6 rounded-full transition-colors relative ${form.is_free ? 'bg-primary' : 'bg-[var(--border-color)]'}`}>
              <input type="checkbox" name="is_free" checked={form.is_free} onChange={handleChange} className="sr-only" />
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.is_free ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-theme-primary font-semibold">كورس مجاني</span>
          </label>
          {!form.is_free && (
            <div className="relative">
              <input
                type="number" name="price_cash" value={form.price_cash} onChange={handleChange} min="0" placeholder="e.g. 500"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors placeholder:text-theme-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary font-semibold">جنيه</span>
            </div>
          )}
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">الصف المستهدف</label>
          <p className="text-theme-muted text-xs mb-4">فقط طلاب الصف المحدد يمكنهم رؤية هذا الكورس. اتركه فارغًا لإظهاره لكل الصفوف.</p>
          <div className="grid grid-cols-3 gap-3">
            {GRADES.map((g) => (
              <button key={g.value} type="button"
                onClick={() => setForm(prev => ({ ...prev, target_grade: prev.target_grade === g.value ? '' : g.value }))}
                className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${
                  form.target_grade === g.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-[var(--border-color)] bg-[var(--bg-input)] text-theme-secondary hover:border-primary'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
          {form.target_grade && (
            <button type="button" onClick={() => setForm(prev => ({ ...prev, target_grade: '' }))}
              className="mt-3 text-xs text-theme-muted hover:text-theme-primary underline">
              مسح (إظهار لكل الصفوف)
            </button>
          )}
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">الظهور</label>
          <div className="flex items-center justify-between">
            <span className="text-theme-primary font-semibold">
              {form.published ? 'منشور — مرئي للطلاب' : 'مسودة — مخفي عن الطلاب'}
            </span>
            <button
              type="button" role="switch" aria-checked={form.published}
              onClick={() => setForm(prev => ({ ...prev, published: !prev.published }))}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.published ? 'bg-green-600' : 'bg-[var(--border-color)]'}`}
              dir="ltr"
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="button" suppressHydrationWarning onClick={() => router.push('/admin/courses')}
            className="px-6 py-4 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary rounded-lg font-bold transition-all border border-[var(--border-color)]">
            إلغاء
          </button>
          <button type="submit" disabled={loading} suppressHydrationWarning
            className="flex-1 py-4 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 shadow-lg" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
            {loading ? 'جاري الإنشاء...' : '← إنشاء الكورس وإضافة المحتوى'}
          </button>
        </div>
      </form>
    </div>
  )
}
