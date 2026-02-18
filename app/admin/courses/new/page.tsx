'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewCoursePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price_cash: '',
    is_free: false,
    published: false,
  })

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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); setLoading(false); return }

      const { data, error: insertError } = await supabase
        .from('courses')
        .insert({
          title: form.title,
          description: form.description,
          price_cash: form.is_free ? 0 : parseFloat(form.price_cash) || 0,
          is_free: form.is_free,
          published: form.published,
          teacher_id: user.id,
        })
        .select()
        .single()

      if (insertError) { setError(insertError.message); setLoading(false); return }
      router.push(`/admin/courses/${data.id}/content`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <button onClick={() => router.back()} className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors">
          ← Back to Courses
        </button>
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">Create New Course</h1>
        <p className="text-[#B3B3B3]">Fill in the details to create a new course</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
          <button type="submit" disabled={loading}
            className="flex-1 py-4 bg-[#6A0DAD] text-[#EFEFEF] rounded-lg font-bold text-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50 shadow-lg">
            {loading ? 'Creating...' : 'Create Course & Add Content →'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-4 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-bold hover:bg-[#4A4A4A] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
