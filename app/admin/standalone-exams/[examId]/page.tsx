'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  order_index: number
  image_url: string | null
  question_text: string | null
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct: 'a'|'b'|'c'|'d'
  solution: string | null
}

export default function StandaloneExamQuestionsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params)
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [questionMode, setQuestionMode] = useState<'image'|'text'>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [questionText, setQuestionText] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correct, setCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [solution, setSolution] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editA, setEditA] = useState(''); const [editB, setEditB] = useState('')
  const [editC, setEditC] = useState(''); const [editD, setEditD] = useState('')
  const [editCorrect, setEditCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [editSolution, setEditSolution] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/standalone-exams/${examId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setExam(json.exam); setQuestions(json.questions ?? [])
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [examId])

  useEffect(() => { fetchData() }, [fetchData])

  const callApi = async (body: object) => {
    const res = await fetch(`/api/admin/standalone-exams/${examId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  const addQuestion = async () => {
    if (questionMode === 'text' && !questionText.trim()) return
    if (questionMode === 'image' && !imageFile) return
    setSaving(true); setError(null)
    try {
      if (questionMode === 'image') {
        const form = new FormData()
        form.append('file', imageFile!)
        const uploadRes = await fetch(`/api/admin/courses/exam-image-upload`, { method: 'POST', body: form })
        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed')
        await callApi({ action: 'addQuestion', imageUrl: uploadJson.publicUrl, correct, orderIndex: questions.length + 1, solution: solution.trim() || null })
      } else {
        await callApi({ action: 'addQuestion', questionText: questionText.trim(), correct, orderIndex: questions.length + 1, optionA: optionA.trim() || null, optionB: optionB.trim() || null, optionC: optionC.trim() || null, optionD: optionD.trim() || null, solution: solution.trim() || null })
      }
      setImageFile(null); setQuestionText(''); setOptionA(''); setOptionB(''); setOptionC(''); setOptionD(''); setCorrect('a'); setSolution('')
      fetchData()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('حذف هذا السؤال؟')) return
    try { await callApi({ action: 'deleteQuestion', questionId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  const startEdit = (q: Question) => {
    setEditingId(q.id); setEditText(q.question_text || ''); setEditA(q.option_a || ''); setEditB(q.option_b || ''); setEditC(q.option_c || ''); setEditD(q.option_d || ''); setEditCorrect(q.correct); setEditSolution(q.solution || '')
  }

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return
    setSavingEdit(true); setError(null)
    try {
      await callApi({ action: 'updateQuestion', questionId: editingId, questionText: editText.trim(), correct: editCorrect, optionA: editA.trim() || null, optionB: editB.trim() || null, optionC: editC.trim() || null, optionD: editD.trim() || null, solution: editSolution.trim() || null })
      setEditingId(null); fetchData()
    } catch (e: any) { setError(e.message) }
    setSavingEdit(false)
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-theme-secondary text-xl animate-pulse">جاري التحميل...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      <button suppressHydrationWarning onClick={() => router.push('/admin/standalone-exams')} className="text-theme-secondary hover:text-theme-primary flex items-center gap-2 mb-4 text-sm">← رجوع للامتحانات</button>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-theme-primary uppercase italic font-payback">{exam?.title}</h1>
        <p className="text-theme-secondary text-sm mt-1">{questions.length} سؤال</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>}

      {questions.length > 0 && (
        <div className="bg-theme-card rounded-xl border-2 border-[var(--border-color)] mb-6 divide-y divide-[var(--border-color)]">
          {questions.map((q, qi) => (
            <div key={q.id}>
              {editingId !== q.id ? (
                <div className="flex items-start gap-3 px-4 md:px-6 py-3 hover:bg-[var(--bg-card-alt)] transition-colors">
                  <span className="text-yellow-500 font-bold text-sm w-6 flex-shrink-0 pt-1">Q{qi + 1}</span>
                  {q.image_url ? (
                    <div className="w-28 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-color)]" style={{ minHeight: 72 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={q.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] px-3 py-2">
                      <p className="text-theme-primary text-sm font-semibold line-clamp-2">{q.question_text}</p>
                      {(q.option_a || q.option_b || q.option_c || q.option_d) && (
                        <div className="grid grid-cols-2 gap-1 mt-2">
                          {(['a','b','c','d'] as const).map(opt => {
                            const val = q[`option_${opt}` as keyof Question] as string | null
                            if (!val) return null
                            return (
                              <div key={opt} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${q.correct === opt ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-[var(--bg-card-alt)] text-theme-secondary'}`}>
                                <span className="font-black uppercase">{opt}</span><span className="truncate">{val}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {q.solution && <div className="mt-2 text-xs text-blue-400 bg-blue-900/10 rounded px-2 py-1 border border-blue-500/20">💡 {q.solution}</div>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-black rounded-full border border-green-600/30 uppercase">{q.correct}</span>
                    {!q.image_url && <button suppressHydrationWarning onClick={() => startEdit(q)} className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold">✏️ تعديل</button>}
                    <button suppressHydrationWarning onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">حذف</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 md:px-6 py-4 bg-yellow-900/10 border-l-4 border-yellow-500 space-y-3">
                  <p className="text-yellow-400 text-xs font-bold uppercase">✏️ تعديل سؤال {qi + 1}</p>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-yellow-600/40 focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm resize-none" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([{ opt: 'a' as const, val: editA, set: setEditA }, { opt: 'b' as const, val: editB, set: setEditB }, { opt: 'c' as const, val: editC, set: setEditC }, { opt: 'd' as const, val: editD, set: setEditD }]).map(({ opt, val, set }) => (
                      <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${editCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                        <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${editCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                        <input type="text" value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#B3B3B3] text-xs font-semibold">الإجابة الصحيحة:</span>
                    <div className="flex gap-2">
                      {(['a','b','c','d'] as const).map(opt => (
                        <button key={opt} suppressHydrationWarning type="button" onClick={() => setEditCorrect(opt)}
                          className={`w-9 h-9 rounded-full text-xs font-black uppercase transition-all ${editCorrect === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-900/10 p-3">
                    <label className="block text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">💡 الشرح (اختياري)</label>
                    <textarea value={editSolution} onChange={e => setEditSolution(e.target.value)} rows={2}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-blue-500/20 focus:border-blue-500 rounded-lg text-[#EFEFEF] outline-none text-sm resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button suppressHydrationWarning onClick={saveEdit} disabled={savingEdit || !editText.trim()}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 disabled:opacity-40">{savingEdit ? 'جاري الحفظ...' : '✓ حفظ'}</button>
                    <button suppressHydrationWarning onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)]">إلغاء</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-theme-card rounded-xl border-2 border-yellow-600/50 p-5">
        <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">➕ إضافة سؤال جديد</p>
        <div className="flex gap-2 mb-4">
          {(['text', 'image'] as const).map(mode => (
            <button key={mode} suppressHydrationWarning type="button" onClick={() => { setQuestionMode(mode); setImageFile(null); setQuestionText('') }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${questionMode === mode ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-yellow-600'}`}>
              {mode === 'text' ? '📝 سؤال بنص' : '🖼️ سؤال بصورة'}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {questionMode === 'image' ? (
            <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-yellow-500 rounded-xl p-6 text-center cursor-pointer transition-colors group" onClick={() => document.getElementById('sa-img-upload')?.click()}>
              <input id="sa-img-upload" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f) }} />
              {imageFile
                ? <div className="flex items-center justify-center gap-3"><span className="text-3xl">🖼️</span><p className="text-[#EFEFEF] font-semibold">{imageFile.name}</p><button type="button" onClick={e => { e.stopPropagation(); setImageFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button></div>
                : <div><p className="text-4xl mb-2">📸</p><p className="text-[#EFEFEF] font-semibold group-hover:text-yellow-400">اضغط لرفع صورة السؤال</p><p className="text-[#555] text-xs mt-1">PNG, JPG, WEBP</p></div>}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea placeholder="اكتب نص السؤال هنا..." value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3}
                className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-yellow-500 rounded-xl text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 resize-none leading-relaxed" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([{ opt: 'a' as const, val: optionA, set: setOptionA }, { opt: 'b' as const, val: optionB, set: setOptionB }, { opt: 'c' as const, val: optionC, set: setOptionC }, { opt: 'd' as const, val: optionD, set: setOptionD }]).map(({ opt, val, set }) => (
                  <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${correct === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                    <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${correct === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                    <input type="text" placeholder={`خيار ${opt.toUpperCase()}`} value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[#B3B3B3] text-sm font-semibold">الإجابة الصحيحة:</span>
            <div className="flex gap-2">
              {(['a','b','c','d'] as const).map(opt => (
                <button key={opt} suppressHydrationWarning type="button" onClick={() => setCorrect(opt)}
                  className={`w-12 h-12 rounded-xl text-sm font-black uppercase transition-all ${correct === opt ? 'bg-green-500 text-white scale-110' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 p-3">
            <label className="block text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">💡 الشرح / مفتاح الإجابة (اختياري)</label>
            <textarea value={solution} onChange={e => setSolution(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-blue-500/20 focus:border-blue-500 rounded-lg text-[#EFEFEF] outline-none text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button suppressHydrationWarning onClick={addQuestion}
              disabled={saving || (questionMode === 'text' ? !questionText.trim() : !imageFile)}
              className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">
              {saving ? 'جاري الحفظ...' : '➕ إضافة سؤال'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
