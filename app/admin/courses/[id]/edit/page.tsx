'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', price_cash: '', is_free: false, published: false,
  })

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
        })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    const res = await fetch(`/api/admin/courses/${id}/details`, {
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
    if (json.error) { setError(json.error); setSaving(false); return }
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return
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

  if (loading) return <div className="p-8 text-[#B3B3B3] animate-pulse">Loading...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <button suppressHydrationWarning onClick={() => router.push(`/admin/courses/${id}/content`)}
          className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors">
          ← Back to Content
        </button>
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">Edit Course</h1>
        <p className="text-[#B3B3B3]">Update course details</p>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-500/20 border-2 border-green-500 rounded-lg text-green-400 font-semibold">✓ Course updated successfully</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-2 uppercase tracking-wider">Course Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required
            className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors" />
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6">
          <label className="block text-[#B3B3B3] text-sm font-bold mb-2 uppercase tracking-wider">Description *</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
            className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors resize-none" />
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
              <input type="number" name="price_cash" value={form.price_cash} onChange={handleChange} min="0"
                className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors" />
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
          <button type="submit" disabled={saving} suppressHydrationWarning
            className="flex-1 py-4 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg font-bold text-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50 shadow-lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" suppressHydrationWarning onClick={() => router.push(`/admin/courses/${id}/content`)}
            className="px-6 py-4 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-bold hover:bg-[#4A4A4A] transition-all">
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-8 p-6 bg-[#2A2A2A] rounded-xl border-2 border-red-500/30">
        <h3 className="text-red-400 font-bold mb-2">Danger Zone</h3>
        <p className="text-[#B3B3B3] text-sm mb-4">Deleting a course will hide it from students. This can be reversed in the database if needed.</p>
        <button suppressHydrationWarning onClick={handleDelete} disabled={deleting}
          className="px-6 py-3 bg-red-600/20 border-2 border-red-500 text-red-400 rounded-lg font-bold hover:bg-red-600/40 transition-all disabled:opacity-50">
          {deleting ? 'Deleting...' : 'Delete Course'}
        </button>
      </div>
    </div>
  )
}
