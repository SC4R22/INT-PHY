'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const GRADES = [
  { value: 'sec_1', label: 'ثانوي 1' },
  { value: 'sec_2', label: 'ثانوي 2' },
  { value: 'sec_3', label: 'ثانوي 3' },
]

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', price_cash: '', is_free: false, published: false, target_grade: '',
  })
  const [existingThumbUrl, setExistingThumbUrl] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [removeThumb, setRemoveThumb] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/courses/${id}/details`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError('Course not found'); setLoading(false); return }
        const d = json.course
        setForm({
          title: d.title || '',
          description: d.description || '',
          price_cash: d.price_cash?.toString() || '',
          is_free: d.is_free || false,
          published: d.published || false,
          target_grade: d.target_grade || '',
        })
        setExistingThumbUrl(d.thumbnail_url || null)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load course'); setLoading(false) })
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('الصورة يجب أن تكون أقل من 5 ميجابايت'); return }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setRemoveThumb(false)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { setError('الصورة يجب أن تكون أقل من 5 ميجابايت'); return }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setRemoveThumb(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    let thumbnail_url: string | null | undefined = undefined

    if (thumbnailFile) {
      const supabase = createClient()
      const ext = thumbnailFile.name.split('.').pop()
      const path = `${id}/thumbnail.${ext}`
      const { error: upErr } = await supabase.storage
        .from('course-thumbnails')
        .upload(path, thumbnailFile, { upsert: true, contentType: thumbnailFile.type })
      if (upErr) { setError('فشل رفع الصورة: ' + upErr.message); setSaving(false); return }
      const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
      thumbnail_url = data.publicUrl
    } else if (removeThumb) {
      thumbnail_url = null
    }

    const res = await fetch(`/api/admin/courses/${id}/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        price_cash: form.is_free ? 0 : parseFloat(form.price_cash) || 0,
        is_free: form.is_free,
        published: form.published,
        target_grade: form.target_grade || null,
        ...(thumbnail_url !== undefined ? { thumbnail_url } : {}),
      }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }

    if (thumbnail_url !== undefined) {
      setExistingThumbUrl(thumbnail_url)
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setRemoveThumb(false)
    }
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ لا يمكن التراجع عن هذا الإجراء.')) return
    setDeleting(true)
    const res = await fetch(`/api/admin/courses/${id}/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setDeleting(false); return }
    router.push('/admin/courses')
  }

  const currentPreview = thumbnailPreview ?? (removeThumb ? null : existingThumbUrl)

  if (loading) return <div className="p-8 text-theme-secondary animate-pulse">جاري التحميل...</div>

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button suppressHydrationWarning onClick={() => router.push(`/admin/courses/${id}/content`)}
          className="text-theme-secondary hover:text-theme-primary flex items-center gap-2 mb-4 transition-colors">
          ← رجوع للمحتوى
        </button>
        <h1 className="text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">تعديل الكورس</h1>
        <p className="text-theme-secondary">تحديث تفاصيل الكورس</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-500/20 border-2 border-green-500 rounded-lg text-green-400 font-semibold">✓ تم تحديث الكورس بنجاح</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Thumbnail Upload */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">صورة الكورس</label>
          <div
            className="relative rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-primary transition-colors cursor-pointer overflow-hidden"
            style={{ aspectRatio: '16/9' }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {currentPreview ? (
              <>
                <Image src={currentPreview} alt="Thumbnail preview" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold text-sm">اضغط للتغيير</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setThumbnailFile(null)
                    setThumbnailPreview(null)
                    setRemoveThumb(true)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold transition-colors"
                >
                  ✕
                </button>
                {thumbnailFile && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-yellow-600/90 rounded text-white text-xs font-bold">
                    جديد — غير محفوظ
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-theme-secondary">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center text-2xl">🖼️</div>
                <div className="text-center">
                  <p className="font-semibold text-sm">اضغط أو اسحب وأفلت لرفع الصورة</p>
                  <p className="text-xs text-theme-muted mt-1">JPG, PNG, WebP · الحد الأقصى 5MB · 16:9 مفضل</p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleThumbnailChange}
            className="hidden"
          />
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-2 uppercase tracking-wider">عنوان الكورس *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors" />
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-2 uppercase tracking-wider">الوصف *</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
            className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors resize-none" />
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">السعر</label>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <div dir="ltr" className={`w-12 h-6 rounded-full transition-colors relative ${form.is_free ? 'bg-primary' : 'bg-[var(--border-color)]'}`}>
              <input type="checkbox" name="is_free" checked={form.is_free} onChange={handleChange} className="sr-only" />
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.is_free ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-theme-primary font-semibold">كورس مجاني</span>
          </label>
          {!form.is_free && (
            <div className="relative">
              <input type="number" name="price_cash" value={form.price_cash} onChange={handleChange} min="0"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary font-semibold">جنيه</span>
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
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
              className="mt-3 text-xs text-theme-muted hover:text-theme-secondary underline">
              مسح (إظهار لكل الصفوف)
            </button>
          )}
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-color)]">
          <label className="block text-theme-secondary text-sm font-bold mb-4 uppercase tracking-wider">الظهور</label>
          <div className="flex items-center justify-between">
            <span className="text-theme-primary font-semibold">
              {form.published ? 'منشور — مرئي للطلاب' : 'مسودة — مخفي عن الطلاب'}
            </span>
            <button type="button" role="switch" aria-checked={form.published} dir="ltr"
              onClick={() => setForm(prev => ({ ...prev, published: !prev.published }))}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.published ? 'bg-green-600' : 'bg-[var(--border-color)]'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="button" suppressHydrationWarning onClick={() => router.push(`/admin/courses/${id}/content`)}
            className="px-6 py-4 bg-[var(--bg-card-alt)] text-theme-primary rounded-lg font-bold hover:bg-[var(--border-color)] transition-all">
            إلغاء
          </button>
          <button type="submit" disabled={saving} suppressHydrationWarning
            className="flex-1 py-4 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 shadow-lg" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </form>

      <div className="mt-8 p-6 bg-[var(--bg-card)] rounded-xl border-2 border-red-500/30">
        <h3 className="text-red-400 font-bold mb-2">منطقة الخطر</h3>
        <p className="text-theme-secondary text-sm mb-4">حذف الكورس سيخفيه عن الطلاب. يمكن التراجع عنه من قاعدة البيانات إن لزم.</p>
        <button suppressHydrationWarning onClick={handleDelete} disabled={deleting}
          className="px-6 py-3 bg-red-600/20 border-2 border-red-500 text-red-400 rounded-lg font-bold hover:bg-red-600/40 transition-all disabled:opacity-50">
          {deleting ? 'جاري الحذف...' : 'حذف الكورس'}
        </button>
      </div>
    </div>
  )
}
