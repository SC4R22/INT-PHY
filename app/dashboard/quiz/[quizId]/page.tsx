'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  order_index: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
}

interface QuizData {
  quiz: { id: string; title: string; module_id: string }
  questions: Question[]
  submission: { score: number; total: number; answers: Record<string, string> } | null
}

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params)
  const router = useRouter()

  const [data, setData] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; correct: Record<string, string> } | null>(null)
  const [showingPrevious, setShowingPrevious] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Fetch quiz questions and existing submission in parallel
        const [quizRes, subRes] = await Promise.all([
          fetch(`/api/quiz?quizId=${quizId}&getQuestions=1`),
          fetch(`/api/quiz?quizId=${quizId}`)
        ])
        const quizJson = await quizRes.json()
        const subJson = await subRes.json()
        if (!quizRes.ok) { setError(quizJson.error); return }
        setData({ ...quizJson, submission: subJson.submission ?? null })
        if (subJson.submission) {
          setAnswers(subJson.submission.answers ?? {})
          setShowingPrevious(true)
        }
      } catch (e: any) { setError(e.message) }
      setLoading(false)
    }
    load()
  }, [quizId])

  const submit = async () => {
    if (!data) return
    const unanswered = data.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      setError(`Please answer all questions (${unanswered.length} remaining)`)
      return
    }
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult({ score: json.score, total: json.total, correct: json.correct })
    } catch (e: any) { setError(e.message) }
    setSubmitting(false)
  }

  const retake = () => {
    setAnswers({})
    setResult(null)
    setShowingPrevious(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#25292D] flex items-center justify-center">
      <div className="text-[#B3B3B3] text-xl animate-pulse">Loading quiz...</div>
    </div>
  )

  if (error && !data) return (
    <div className="min-h-screen bg-[#25292D] flex items-center justify-center">
      <div className="text-red-400 text-lg">{error}</div>
    </div>
  )

  const questions = data?.questions ?? []
  const answeredCount = questions.filter(q => answers[q.id]).length
  const isFinished = !!result || (showingPrevious && !!data?.submission)
  const displayResult = result ?? (showingPrevious ? data?.submission : null)

  return (
    <div className="min-h-screen bg-[#25292D]">
      {/* Header */}
      <header className="bg-[#1e2125] border-b-2 border-[#3A3A3A] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()} className="text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors text-sm font-semibold flex-shrink-0">← Back</button>
            <span className="text-[#3A3A3A]">/</span>
            <span className="text-[#EFEFEF] font-bold text-sm truncate">{data?.quiz.title}</span>
            <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/40 flex-shrink-0">QUIZ</span>
          </div>
          {!isFinished && (
            <span className="text-[#B3B3B3] text-sm flex-shrink-0 whitespace-nowrap">{answeredCount}/{questions.length}</span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Result banner */}
        {isFinished && displayResult && (
          <div className={`mb-8 rounded-2xl p-6 border-2 text-center ${
            (displayResult.score / displayResult.total) >= 0.6
              ? 'bg-green-900/20 border-green-600/40'
              : 'bg-red-900/20 border-red-600/40'
          }`}>
            <p className="text-5xl mb-3">{(displayResult.score / displayResult.total) >= 0.6 ? '🎉' : '📖'}</p>
            <p className={`text-3xl font-black mb-1 ${(displayResult.score / displayResult.total) >= 0.6 ? 'text-green-400' : 'text-red-400'}`}>
              {displayResult.score} / {displayResult.total}
            </p>
            <p className={`text-xl font-bold mb-3 ${(displayResult.score / displayResult.total) >= 0.6 ? 'text-green-300' : 'text-red-300'}`}>
              {Math.round((displayResult.score / displayResult.total) * 100)}%
            </p>
            <p className="text-[#B3B3B3] text-sm mb-5">
              {(displayResult.score / displayResult.total) >= 0.6
                ? 'Great job! You passed this quiz.'
                : 'Keep studying and try again!'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={retake}
                className="px-6 py-2.5 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-500 transition-colors text-sm">
                🔄 Retake Quiz
              </button>
              <button onClick={() => router.back()}
                className="px-6 py-2.5 bg-[#3A3A3A] text-[#EFEFEF] font-bold rounded-xl hover:bg-[#4A4A4A] transition-colors text-sm">
                ← Back to Course
              </button>
            </div>
          </div>
        )}

        {/* Progress bar (while answering) */}
        {!isFinished && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-[#B3B3B3] mb-2">
              <span>Progress</span>
              <span>{answeredCount} of {questions.length} answered</span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
              <div className="bg-yellow-500 h-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const selected = answers[q.id]
            const isCorrectAnswer = result?.correct?.[q.id] ?? (showingPrevious && data?.submission ? undefined : undefined)
            const opts = [
              { key: 'a', label: q.option_a },
              { key: 'b', label: q.option_b },
              { key: 'c', label: q.option_c },
              { key: 'd', label: q.option_d },
            ]
            return (
              <div key={q.id} className={`bg-[#2A2A2A] rounded-xl p-5 border-2 transition-colors ${
                selected ? 'border-yellow-600/50' : 'border-[#3A3A3A]'
              }`}>
                <div className="flex gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-black">{idx + 1}</span>
                  <p className="text-[#EFEFEF] font-semibold text-base leading-snug">{q.question_text}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opts.map(opt => {
                    const isSelected = selected === opt.key
                    const isDisabled = isFinished

                    let btnClass = 'border-[#3A3A3A] bg-[#1a1a1a] text-[#B3B3B3] hover:border-yellow-600 hover:text-[#EFEFEF]'
                    if (isSelected && !isFinished) btnClass = 'border-yellow-600 bg-yellow-600/20 text-[#EFEFEF]'
                    if (isFinished && isSelected) btnClass = 'border-yellow-600/60 bg-yellow-600/10 text-[#EFEFEF]'

                    return (
                      <button
                        key={opt.key}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${btnClass} ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 border-2 transition-colors ${
                          isSelected ? 'bg-yellow-600 border-yellow-600 text-white' : 'border-[#555] text-[#555]'
                        }`}>{opt.key}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit button */}
        {!isFinished && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={submit}
              disabled={submitting || answeredCount < questions.length}
              className="w-full sm:w-auto px-10 py-4 bg-yellow-600 text-white font-black text-lg rounded-2xl hover:bg-yellow-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : '✓ Submit Quiz'}
            </button>
            {answeredCount < questions.length && (
              <p className="text-[#B3B3B3] text-sm">{questions.length - answeredCount} question{questions.length - answeredCount > 1 ? 's' : ''} left to answer</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
