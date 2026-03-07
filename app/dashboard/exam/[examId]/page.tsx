'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ExamQuestion {
  id: string
  order_index: number
  image_url: string | null
  question_text: string | null
}

interface ExamData {
  exam: { id: string; title: string; module_id: string }
  questions: ExamQuestion[]
  submission: { score: number; total: number; answers: Record<string, string> } | null
}

const OPTION_LABELS = ['a', 'b', 'c', 'd'] as const

export default function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params)
  const router = useRouter()

  const [data, setData] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; correct: Record<string, string> } | null>(null)
  const [showingPrevious, setShowingPrevious] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [examRes, subRes] = await Promise.all([
          fetch(`/api/exam?examId=${examId}&getQuestions=1`),
          fetch(`/api/exam?examId=${examId}`)
        ])
        const examJson = await examRes.json()
        const subJson = await subRes.json()
        if (!examRes.ok) { setError(examJson.error); return }
        setData({ ...examJson, submission: subJson.submission ?? null })
        if (subJson.submission) {
          setAnswers(subJson.submission.answers ?? {})
          setShowingPrevious(true)
        }
      } catch (e: any) { setError(e.message) }
      setLoading(false)
    }
    load()
  }, [examId])

  const submit = async () => {
    if (!data) return
    const unanswered = data.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      setError(`Please answer all ${unanswered.length} remaining question(s)`)
      return
    }
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, answers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult({ score: json.score, total: json.total, correct: json.correct })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) { setError(e.message) }
    setSubmitting(false)
  }

  const retake = () => {
    setAnswers({})
    setResult(null)
    setShowingPrevious(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center">
      <div className="text-theme-secondary text-xl animate-pulse">جاري تحميل الاختبار...</div>
    </div>
  )

  if (error && !data) return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center">
      <div className="text-red-600 dark:text-red-400 text-lg">{error}</div>
    </div>
  )

  const questions = data?.questions ?? []
  const answeredCount = questions.filter(q => answers[q.id]).length
  const isFinished = !!result || showingPrevious
  const displayResult = result ?? (showingPrevious ? data?.submission : null)
  const pct = displayResult ? Math.round((displayResult.score / displayResult.total) * 100) : 0

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expandedImage} alt="Question" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/80">✕</button>
        </div>
      )}

      {/* Header */}
      <header className="bg-[var(--bg-nav)] border-b-2 border-yellow-500/30 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()} className="text-theme-secondary hover:text-theme-primary transition-colors text-sm font-semibold flex-shrink-0">← رجوع</button>
            <span className="text-theme-muted">/</span>
            <span className="text-theme-primary font-bold text-sm truncate">{data?.exam.title}</span>
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/40 flex-shrink-0">اختبار</span>
          </div>
          {!isFinished && (
            <span className="text-theme-secondary text-sm flex-shrink-0 whitespace-nowrap">{answeredCount}/{questions.length} تمت الإجابة</span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Result banner */}
        {isFinished && displayResult && (
          <div className={`mb-8 rounded-2xl p-6 md:p-8 border-2 text-center ${pct >= 60 ? 'bg-green-500/10 border-green-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
            <p className="text-6xl mb-4">{pct >= 60 ? '🎉' : '📖'}</p>
            <p className={`text-5xl font-black mb-2 ${pct >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{pct}%</p>
            <p className={`text-2xl font-bold mb-2 ${pct >= 60 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>{displayResult.score} / {displayResult.total} صحيح</p>
            <p className="text-theme-secondary text-sm mb-6">
              {pct >= 60 ? 'ممتاز! لقد نجحت في الاختبار.' : 'راجع الأسئلة وحاول تاني.'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={retake} className="px-6 py-2.5 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-500 transition-colors">🔄 إعادة الاختبار</button>
              <button onClick={() => router.back()} className="px-6 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-colors border border-[var(--border-color)]">← رجوع للكورس</button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!isFinished && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-theme-secondary mb-2">
              <span>{data?.exam.title}</span>
              <span>{answeredCount} من {questions.length} تمت الإجابة</span>
            </div>
            <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-2.5 overflow-hidden">
              <div className="bg-yellow-500 h-full transition-all" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Instructions */}
        {!isFinished && questions.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold">📋 تعليمات الاختبار</p>
            <p className="text-theme-secondary text-sm mt-1">اقرأ كل سؤال بعناية، ثم اختر إجابتك من A أو B أو C أو D. الأسئلة بالصور يمكن تكبيرها بالضغط عليها.</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-8">
          {questions.map((q, idx) => {
            const selected = answers[q.id]
            const correctAnswer = result?.correct?.[q.id]

            return (
              <div key={q.id} className={`bg-theme-card rounded-2xl overflow-hidden border-2 transition-colors ${
                isFinished && correctAnswer
                  ? selected === correctAnswer ? 'border-green-500/50' : 'border-red-500/50'
                  : selected ? 'border-yellow-500/50' : 'border-[var(--border-color)]'
              }`}>
                {/* Question number bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-card-alt)]">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">{idx + 1}</span>
                    <span className="text-theme-secondary text-sm font-semibold">سؤال {idx + 1} من {questions.length}</span>
                  </div>
                  {isFinished && correctAnswer && (
                    <span className={`text-sm font-black ${selected === correctAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selected === correctAnswer ? '✓ صحيح' : `✗ خطأ (الإجابة: ${correctAnswer.toUpperCase()})`}
                    </span>
                  )}
                </div>

                {/* Question body: image or text */}
                <div className="p-5">
                  {q.image_url ? (
                    <div
                      className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card-alt)] cursor-zoom-in mb-5 hover:border-yellow-500/50 transition-colors"
                      onClick={() => setExpandedImage(q.image_url!)}
                      title="Click to enlarge"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.image_url}
                        alt={`Question ${idx + 1}`}
                        className="w-full object-contain max-h-[500px]"
                      />
                      <p className="text-center text-theme-muted text-xs py-1.5">🔍 اضغط للتكبير</p>
                    </div>
                  ) : (
                    <div className="mb-5 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5 px-6 py-5">
                      <p className="text-theme-primary text-base md:text-lg font-semibold leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                    </div>
                  )}

                  {/* A/B/C/D answer buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {OPTION_LABELS.map(opt => {
                      const isSelected = selected === opt
                      const isCorrect = isFinished && result?.correct && result.correct[q.id] === opt
                      const isWrong = isFinished && isSelected && !isCorrect

                      let btnClass = 'bg-[var(--bg-input)] border-[var(--border-color)] text-theme-secondary hover:border-yellow-500 hover:bg-yellow-500/10 hover:text-theme-primary'
                      if (isCorrect) btnClass = 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300'
                      else if (isWrong) btnClass = 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300'
                      else if (isSelected) btnClass = 'bg-yellow-500/20 border-yellow-500 text-theme-primary'

                      return (
                        <button
                          key={opt}
                          disabled={isFinished}
                          onClick={() => !isFinished && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl border-2 font-bold transition-all ${btnClass} ${isFinished ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black border-2 transition-colors ${
                            isCorrect ? 'bg-green-500 border-green-400 text-white'
                            : isWrong ? 'bg-red-500 border-red-400 text-white'
                            : isSelected ? 'bg-yellow-600 border-yellow-500 text-white'
                            : 'border-[var(--text-muted)] text-theme-muted'
                          }`}>
                            {opt.toUpperCase()}
                          </span>
                          {isCorrect && <span className="text-xs text-green-600 dark:text-green-400">✓ صحيح</span>}
                          {isWrong && <span className="text-xs text-red-600 dark:text-red-400">✗ خطأ</span>}
                          {!isCorrect && !isWrong && isSelected && <span className="text-xs text-yellow-600 dark:text-yellow-400">محدد</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit */}
        {!isFinished && questions.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={submit}
              disabled={submitting || answeredCount < questions.length}
              className="w-full sm:w-auto px-12 py-4 bg-yellow-600 text-white font-black text-xl rounded-2xl hover:bg-yellow-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'جاري التسليم...' : '✓ تسليم الاختبار'}
            </button>
            {answeredCount < questions.length && (
              <p className="text-theme-secondary text-sm">{questions.length - answeredCount} سؤال لم تتم الإجابة عليه</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
