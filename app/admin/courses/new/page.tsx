'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCoursePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price_cash: '',
    is_free: false,
    published: false,
  })
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploadingThumb, setUploadingThumb] = useState(false)

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
    if (file.size > 5 * 1024 * 1024) { setError('Thumbnail must be under 5MB'); return }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { setError('Thumbnail must be under 5MB'); return }
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setError(null)
  }

  const uploadThumbnail = async (courseId: string): Promise<string | null> => {
    if (!thumbnailFile) return null
    setUploadingThumb(true)
    const supabase = createClient()
    const ext = thumbnailFile.name.split('.').pop()
    const path = `${courseId}/thumbnail.${ext}`
    const { error: upErr } = await supabase.storage
      .from('course-thumbnails')
      .upload(path, thumbnailFile, { upsert: true, contentType: thumbnailFile.type })
    setUploadingThumb(false)
    if (upErr) { setError('Failed to upload thumbnail: ' + upErr.message); return null }
    const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Create course first
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price_cash: form.is_free ? 0 : parseFloat(form.price_cash) || 0,
          is_free: form.is_free,
          published: form.published,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to create course'); setLoading(false); return }

      const courseId = json.course.id

      // 2. Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbUrl = await uploadThumbnail(courseId)
        if (!thumbUrl) { setLoading(false); return }
        // Save thumbnail_url to the course
        await fetch(`/api/admin/courses/${courseId}/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            price_cash: form.is_free ? 0 : parseFloat(form.price_cash) || 0,
            is_free: form.is_free,
            published: form.published,
            thumbnail_url: thumbUrl,
          }),
        })
      }

      router.push(`/admin/courses/${courseId}/content`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <button suppressHydrationWarning onClick={() => router.push('/admin/courses')}
          className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors">
          ← Back to Courses
        </button>
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">Create New Course</h1>
        <p className="text-[#B3B3B3]">Fill in the details to create a new course</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Thumbnail Upload */}
        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-4 uppercase tracking-wider">Course Thumbnail</label>
          <div
            className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
              thumbnailPreview ? 'border-[#6A0DAD]' : 'border-[#3A3A3A] hover:border-[#6A0DAD]'
            }`}
            style={{ aspectRatio: '16/9' }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {thumbnailPreview ? (
              <>
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="text-white font-bold text-sm">Click to change</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#B3B3B3]">
                <div className="w-14 h-14 rounded-full bg-[#3A3A3A] flex items-center justify-center text-2xl">🖼️</div>
                <div className="text-center">
                  <p className="font-semibold text-sm">Click or drag & drop to upload</p>
                  <p className="text-xs text-[#555] mt-1">JPG, PNG, WebP · Max 5MB · 16:9 recommended</p>
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

        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-2 uppercase tracking-wider">Course Title *</label>
          <input
            type="text" name="title" value={form.title} onChange={handleChange} required
            placeholder="e.g. Physics Grade 11 — Mechanics"
            className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600"
          />
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-2 uppercase tracking-wider">Description *</label>
          <textarea
            name="description" value={form.description} onChange={handleChange} required rows={4}
            placeholder="Describe what students will learn..."
            className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600 resize-none"
          />
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-4 uppercase tracking-wider">Pricing</label>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <div className={`w-12 h-6 rounded-full transition-colors relative ${form.is_free ? 'bg-[#6A0DAD]' : 'bg-[#3A3A3A]'}`}>
              <input type="checkbox" name="is_free" checked={form.is_free} onChange={handleChange} className="sr-only" />
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.is_free ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[#EFEFEF] font-semibold">Free Course</span>
          </label>
          {!form.is_free && (
            <div className="relative">
              <input
                type="number" name="price_cash" value={form.price_cash} onChange={handleChange} min="0" placeholder="e.g. 500"
                className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] font-semibold">EGP</span>
            </div>
          )}
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-4 uppercase tracking-wider">Visibility</label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-12 h-6 rounded-full transition-colors relative ${form.published ? 'bg-green-600' : 'bg-[#3A3A3A]'}`}>
              <input type="checkbox" name="published" checked={form.published} onChange={handleChange} className="sr-only" />
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[#EFEFEF] font-semibold">
              {form.published ? 'Published — visible to students' : 'Draft — hidden from students'}
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading || uploadingThumb} suppressHydrationWarning
            className="flex-1 py-4 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg font-bold text-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50 shadow-lg">
            {uploadingThumb ? 'Uploading thumbnail...' : loading ? 'Creating...' : 'Create Course & Add Content →'}
          </button>
          <button type="button" suppressHydrationWarning onClick={() => router.push('/admin/courses')}
            className="px-6 py-4 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-bold hover:bg-[#4A4A4A] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
