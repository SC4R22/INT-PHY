'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  quiz: { id: string; title: string; module_id: string; course_id: string | null }
  questions: Question[]
  submission: { score: number; total: number; answers: Record<string, string> } | null
}

interface ResultData {
  score: number
  total: number
  correct: Record<string, string>
  solutions: Record<string, string | null>
}

export default function QuizPage({ params, searchParams }: { params: Promise<{ quizId: string }>, searchParams: Promise<{ locked?: string }> }) {
  const { quizId } = use(params)
  const { locked } = use(searchParams)
  const isLockedRedirect = locked === '1'
  const router = useRouter()

  const [data, setData] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [showingPrevious, setShowingPrevious] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
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
          // Also fetch correct+solutions so previous attempt shows full review
          const reviewRes = await fetch(`/api/quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId, answers: subJson.submission.answers }),
          })
          // We re-submit to get correct+solutions — but we use the stored score
          const reviewJson = await reviewRes.json()
          if (reviewRes.ok) {
            setResult({
              score: subJson.submission.score,
              total: subJson.submission.total,
              correct: reviewJson.correct,
              solutions: reviewJson.solutions ?? {},
            })
          }
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
      setError(`من فضلك أجب على كل الأسئلة (${unanswered.length} متبقية)`)
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
      setResult({ score: json.score, total: json.total, correct: json.correct, solutions: json.solutions ?? {} })
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
  const isFinished = !!result
  const displayResult = result ?? (showingPrevious ? data?.submission : null)

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="bg-[var(--bg-nav)] border-b-2 border-[var(--border-color)] py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                const courseId = data?.quiz.course_id
                if (courseId) { router.push(`/dashboard/courses/${courseId}`); router.refresh() }
                else { router.push('/dashboard'); router.refresh() }
              }}
              className="text-theme-secondary hover:text-theme-primary transition-colors text-sm font-semibold flex-shrink-0">← رجوع</button>
            <span className="text-theme-muted">/</span>
            <span className="text-theme-primary font-bold text-sm truncate">{data?.quiz.title}</span>
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/40 flex-shrink-0">كويز</span>
          </div>
          {!isFinished && (
            <span className="text-theme-secondary text-sm flex-shrink-0 whitespace-nowrap">{answeredCount}/{questions.length}</span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {isLockedRedirect && !isFinished && (
          <div className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🔒</span>
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-bold text-sm">الاختبار مطلوب للمتابعة</p>
              <p className="text-yellow-600/70 dark:text-yellow-300/70 text-xs mt-0.5">يجب إكمال هذا الاختبار قبل الوصول للفيديوهات التالية في هذه الوحدة.</p>
            </div>
          </div>
        )}

        {/* Result banner */}
        {isFinished && displayResult && (
          <div className={`mb-8 rounded-2xl p-6 border-2 text-center ${
            (displayResult.score / displayResult.total) >= 0.6
              ? 'bg-green-500/10 border-green-500/40'
              : 'bg-red-500/10 border-red-500/40'
          }`}>
            <p className="text-5xl mb-3">{(displayResult.score / displayResult.total) >= 0.6 ? '🎉' : '📖'}</p>
            <p className={`text-3xl font-black mb-1 ${(displayResult.score / displayResult.total) >= 0.6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {displayResult.score} / {displayResult.total}
            </p>
            <p className={`text-xl font-bold mb-3 ${(displayResult.score / displayResult.total) >= 0.6 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
              {Math.round((displayResult.score / displayResult.total) * 100)}%
            </p>
            <p className="text-theme-secondary text-sm mb-5">
              {(displayResult.score / displayResult.total) >= 0.6
                ? 'أحسنت! لقد نجحت في الاختبار. راجع إجاباتك أدناه.'
                : 'ذاكر أكتر وحاول تاني! راجع شرح الإجابات أدناه.'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={retake}
                className="px-6 py-2.5 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-500 transition-colors text-sm">
                🔄 إعادة الاختبار
              </button>
              <button
                onClick={() => {
                  const courseId = data?.quiz.course_id
                  if (courseId) { router.push(`/dashboard/courses/${courseId}`); router.refresh() }
                  else { router.push('/dashboard'); router.refresh() }
                }}
                className="px-6 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-colors text-sm border border-[var(--border-color)]">
                ← رجوع للكورس
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!isFinished && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-theme-secondary mb-2">
              <span>التقدم</span>
              <span>{answeredCount} من {questions.length} تمت إجابتها</span>
            </div>
            <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-2 overflow-hidden">
              <div className="bg-yellow-500 h-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const selected = answers[q.id]
            const correctAnswer = result?.correct?.[q.id]
            const solution = result?.solutions?.[q.id]
            const isCorrect = isFinished && selected === correctAnswer
            const isWrong = isFinished && selected !== correctAnswer

            const opts = [
              { key: 'a', label: q.option_a },
              { key: 'b', label: q.option_b },
              { key: 'c', label: q.option_c },
              { key: 'd', label: q.option_d },
            ]

            return (
              <div key={q.id} className={`bg-theme-card rounded-xl border-2 overflow-hidden transition-colors ${
                isFinished
                  ? isCorrect ? 'border-green-500/50' : 'border-red-500/50'
                  : selected ? 'border-yellow-500/60' : 'border-[var(--border-color)]'
              }`}>
                {/* Question header with result badge */}
                <div className={`flex items-center justify-between px-5 py-3 ${
                  isFinished
                    ? isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                    : 'bg-[var(--bg-card-alt)]'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 text-white ${
                      isFinished ? isCorrect ? 'bg-green-600' : 'bg-red-600' : 'bg-yellow-600'
                    }`}>{idx + 1}</span>
                    <p className="text-theme-primary font-semibold text-base leading-snug">{q.question_text}</p>
                  </div>
                  {isFinished && (
                    <span className={`text-xs font-black flex-shrink-0 ml-2 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isCorrect ? '✓ صحيح' : `✗ خطأ`}
                    </span>
                  )}
                </div>

                {/* Options */}
                <div className="p-5 pb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {opts.map(opt => {
                      const isSelected = selected === opt.key
                      const isOptCorrect = isFinished && correctAnswer === opt.key
                      const isOptWrong = isFinished && isSelected && !isOptCorrect
                      const isDisabled = isFinished

                      let btnClass = 'border-[var(--border-color)] bg-[var(--bg-input)] text-theme-secondary hover:border-yellow-500 hover:text-theme-primary'
                      if (isOptCorrect) btnClass = 'border-green-500 bg-green-500/15 text-green-700 dark:text-green-300'
                      else if (isOptWrong) btnClass = 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300'
                      else if (isSelected && !isFinished) btnClass = 'border-yellow-500 bg-yellow-500/20 text-theme-primary'

                      return (
                        <button
                          key={opt.key}
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${btnClass} ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 border-2 transition-colors ${
                            isOptCorrect ? 'bg-green-500 border-green-500 text-white'
                            : isOptWrong ? 'bg-red-500 border-red-500 text-white'
                            : isSelected ? 'bg-yellow-600 border-yellow-600 text-white'
                            : 'border-[var(--text-muted)] text-theme-muted'
                          }`}>{opt.key}</span>
                          <span className="text-sm font-medium flex-1">{opt.label}</span>
                          {isOptCorrect && <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">✓</span>}
                          {isOptWrong && <span className="text-xs text-red-600 dark:text-red-400 flex-shrink-0">✗</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Solution box — shown after submission */}
                {isFinished && (
                  <div className={`mx-5 mb-5 rounded-xl border-2 p-4 ${
                    isCorrect
                      ? 'bg-green-500/8 border-green-500/40'
                      : 'bg-blue-500/8 border-blue-500/40'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg flex-shrink-0">{isCorrect ? '🌟' : '💡'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black uppercase tracking-wider mb-1.5 ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {isCorrect ? 'إجابتك صحيحة!' : `الإجابة الصحيحة: ${correctAnswer?.toUpperCase()}`}
                        </p>
                        {solution ? (
                          <p className="text-theme-secondary text-sm leading-relaxed">{solution}</p>
                        ) : (
                          <p className="text-theme-muted text-sm italic">لا يوجد شرح إضافي لهذا السؤال.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
              {submitting ? 'جاري التسليم...' : '✓ تسليم الاختبار'}
            </button>
            {answeredCount < questions.length && (
              <p className="text-theme-secondary text-sm">{questions.length - answeredCount} سؤال متبقي للإجابة</p>
            )}
          </div>
        )}

        {/* Retake button at bottom after review */}
        {isFinished && (
          <div className="mt-8 flex justify-center">
            <button onClick={retake}
              className="px-8 py-3 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-500 transition-colors text-sm">
              🔄 إعادة الاختبار
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
