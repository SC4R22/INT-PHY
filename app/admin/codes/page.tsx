'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Course { id: string; title: string }
interface AccessCode {
  id: string; code: string; course_id: string; is_used: boolean; created_at: string; expires_at: string | null
  course: { title: string } | null
  used_by_profile: { full_name: string; phone_number: string } | null
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomBytes = new Uint8Array(12)
  crypto.getRandomValues(randomBytes)
  let code = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars[randomBytes[i] % chars.length]
  }
  return code
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

  // Generate form
  const [genForm, setGenForm] = useState({ course_id: '', quantity: '1', expires_in_days: '' })

  const supabase = useMemo(() => createClient(), [])

  const fetchData = async () => {
    setLoading(true)
    const { data: coursesData } = await supabase.from('courses').select('id, title').is('deleted_at', null).order('title')
    setCourses(coursesData || [])

    const { data: codesData } = await supabase
      .from('access_codes')
      .select(`
        id, code, course_id, is_used, created_at, expires_at,
        course:course_id (title),
        used_by_profile:used_by (full_name, phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
    setCodes((codesData as any) || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genForm.course_id) { setError('Please select a course'); return }
    setGenerating(true)
    setError(null)
    setSuccess(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setGenerating(false); return }

    const quantity = Math.min(parseInt(genForm.quantity) || 1, 100)
    const expiresAt = genForm.expires_in_days
      ? new Date(Date.now() + parseInt(genForm.expires_in_days) * 86400000).toISOString()
      : null

    const newCodes = Array.from({ length: quantity }, () => ({
      code: generateCode(),
      course_id: genForm.course_id,
      is_used: false,
      created_by: user.id,
      expires_at: expiresAt,
    }))

    const { error: insertError } = await supabase.from('access_codes').insert(newCodes)
    if (insertError) { setError(insertError.message); setGenerating(false); return }

    setSuccess(`✓ Generated ${quantity} access code${quantity > 1 ? 's' : ''} successfully`)
    setGenerating(false)
    fetchData()
    setTimeout(() => setSuccess(null), 4000)
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Delete this unused code?')) return
    await supabase.from('access_codes').delete().eq('id', id).eq('is_used', false)
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">Access Codes</h1>
        <p className="text-[#B3B3B3]">Generate and manage enrollment codes for students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Codes', value: stats.total, color: 'border-[#6A0DAD]', textColor: 'text-[#EFEFEF]' },
          { label: 'Available', value: stats.available, color: 'border-green-500', textColor: 'text-green-400' },
          { label: 'Used', value: stats.used, color: 'border-blue-500', textColor: 'text-blue-400' },
          { label: 'Expired', value: stats.expired, color: 'border-red-500', textColor: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-[#2A2A2A] rounded-lg p-4 border-l-4 ${s.color}`}>
            <p className="text-[#B3B3B3] text-sm">{s.label}</p>
            <p className={`text-3xl font-bold ${s.textColor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Generate form */}
      <div className="bg-[#2A2A2A] rounded-xl p-6 mb-8 border-2 border-[#6A0DAD]">
        <h2 className="text-xl font-bold text-[#EFEFEF] mb-4">🎟️ Generate New Codes</h2>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm font-semibold">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm font-semibold">{success}</div>}

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[#B3B3B3] text-xs font-bold mb-1 uppercase tracking-wider">Course *</label>
            <select value={genForm.course_id} onChange={e => setGenForm(p => ({ ...p, course_id: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none">
              <option value="">Select a course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[#B3B3B3] text-xs font-bold mb-1 uppercase tracking-wider">Quantity (max 100)</label>
            <input type="number" min="1" max="100" value={genForm.quantity}
              onChange={e => setGenForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none" />
          </div>
          <div>
            <label className="block text-[#B3B3B3] text-xs font-bold mb-1 uppercase tracking-wider">Expires in (days)</label>
            <input type="number" min="1" placeholder="Never" value={genForm.expires_in_days}
              onChange={e => setGenForm(p => ({ ...p, expires_in_days: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none placeholder:text-gray-600" />
          </div>
          <div className="md:col-span-4">
            <button type="submit" disabled={generating}
              className="px-8 py-3 bg-[#6A0DAD] text-white font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50 shadow-lg">
              {generating ? 'Generating...' : `Generate ${genForm.quantity || 1} Code${parseInt(genForm.quantity) > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded-lg text-[#EFEFEF] text-sm outline-none focus:border-[#6A0DAD]">
          <option value="all">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded-lg text-[#EFEFEF] text-sm outline-none focus:border-[#6A0DAD]">
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="used">Used</option>
          <option value="expired">Expired</option>
        </select>
        <span className="px-3 py-2 text-[#B3B3B3] text-sm">{filteredCodes.length} codes shown</span>
      </div>

      {/* Codes table */}
      <div className="bg-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#6A0DAD]">
              <tr>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Code</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Course</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Status</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Used By</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Expires</th>
                <th className="px-6 py-3 text-left text-[#EFEFEF] font-bold text-sm">Created</th>
                <th className="px-6 py-3 text-right text-[#EFEFEF] font-bold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#3A3A3A]">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-[#B3B3B3] animate-pulse">Loading codes...</td></tr>
              ) : filteredCodes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-[#B3B3B3]">No codes found</td></tr>
              ) : filteredCodes.map(code => {
                const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
                const status = code.is_used ? 'used' : isExpired ? 'expired' : 'available'
                return (
                  <tr key={code.id} className="hover:bg-[#3A3A3A] transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-[#EFEFEF] font-bold tracking-widest text-sm">{code.code}</span>
                    </td>
                    <td className="px-6 py-3 text-[#B3B3B3] text-sm">{code.course?.title || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        status === 'available' ? 'bg-green-500/20 text-green-400' :
                        status === 'used' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[#B3B3B3] text-sm">
                      {code.used_by_profile ? `${code.used_by_profile.full_name} (${code.used_by_profile.phone_number})` : '—'}
                    </td>
                    <td className="px-6 py-3 text-[#B3B3B3] text-sm">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-3 text-[#B3B3B3] text-sm">
                      {new Date(code.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        {!code.is_used && (
                          <button onClick={() => copyCode(code.code, code.id)}
                            className="px-3 py-1 bg-[#6A0DAD]/30 text-[#B3B3B3] hover:text-[#EFEFEF] text-xs font-semibold rounded transition-colors">
                            {copiedId === code.id ? '✓ Copied' : 'Copy'}
                          </button>
                        )}
                        {!code.is_used && (
                          <button onClick={() => deleteCode(code.id)}
                            className="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-semibold rounded hover:bg-red-600/40 transition-colors">
                            Delete
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
