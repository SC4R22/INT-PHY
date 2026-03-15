'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string; title: string; description: string | null
  published: boolean; is_free: boolean; price_cash: number | null; created_at: string
}
interface UserProfile {
  id: string; full_name: string; phone_number: string
  parent_name: string | null; parent_phone_number: string | null
}
interface Enrollment {
  id: string; enrolled_at: string; completed: boolean; progress_percentage: number
  user_profiles: UserProfile | null
}
interface Video { id: string; module_id: string; title: string; order_index: number; duration: number | null }
interface Quiz  { id: string; module_id: string; title: string; order_index: number }
interface Exam  { id: string; module_id: string; title: string }
interface Module {
  id: string; title: string; order_index: number; module_type: 'lesson' | 'exam'
  videos: Video[]; quizzes: Quiz[]; exam: Exam | null
}
interface QuizSub  { id: string; user_id: string; quiz_id: string; score: number; total: number; submitted_at: string }
interface ExamSub  { id: string; user_id: string; exam_id: string; score: number; total: number; submitted_at: string }
interface UserProgress { user_id: string; video_id: string; completed: boolean }

type PanelItem =
  | { kind: 'module'; module: Module }
  | { kind: 'video';  video: Video;  module: Module }
  | { kind: 'quiz';   quiz: Quiz;    module: Module }
  | { kind: 'exam';   exam: Exam;    module: Module }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(score: number, total: number) {
  return total ? Math.round((score / total) * 100) : 0
}

function ScorePill({ score, total }: { score: number; total: number }) {
  if (!total) return <span className="text-theme-muted text-xs">—</span>
  const p = pct(score, total)
  const cls = p >= 80
    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
    : p >= 60
    ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
    : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>{score}/{total} ({p}%)</span>
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{
          width: `${value}%`,
          background: value >= 80 ? '#22c55e' : 'linear-gradient(90deg,#FD1D1D,#FCB045)'
        }} />
      </div>
      <span className="text-xs font-bold" style={{ color: value >= 80 ? '#22c55e' : value >= 50 ? '#FCB045' : '#FD1D1D' }}>
        {value}%
      </span>
    </div>
  )
}

function fmt(sec: number | null) {
  if (!sec) return null
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseStatsPage() {
  const { id: courseId } = useParams<{ id: string }>()

  const [course, setCourse]           = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [modules, setModules]         = useState<Module[]>([])
  const [quizSubs, setQuizSubs]       = useState<QuizSub[]>([])
  const [examSubs, setExamSubs]       = useState<ExamSub[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // UI state
  const [selectedItem, setSelectedItem] = useState<PanelItem | null>(null)
  const [search, setSearch]             = useState('')
  const [gradeSort, setGradeSort]       = useState<'highest' | 'lowest' | 'name'>('highest')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!courseId) return
    fetch(`/api/admin/courses/${courseId}/stats`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setCourse(data.course)
        setEnrollments(data.enrollments || [])
        // Normalise every module so videos/quizzes are always arrays
        setModules((data.modules || []).map((m: any) => ({
          ...m,
          videos:  Array.isArray(m.videos)  ? m.videos  : [],
          quizzes: Array.isArray(m.quizzes) ? m.quizzes : [],
          exam:    m.exam ?? null,
        })))
        setQuizSubs(data.quizSubmissions || [])
        setExamSubs(data.examSubmissions  || [])
        setUserProgress(data.userProgress || [])
        setExpandedModules(new Set((data.modules || []).map((m: any) => m.id)))
      })
      .catch(() => setError('فشل تحميل الإحصائيات'))
      .finally(() => setLoading(false))
  }, [courseId])

  // All enrolled users (flat)
  const enrolledUsers = useMemo(() =>
    enrollments.map(e => e.user_profiles).filter(Boolean) as UserProfile[]
  , [enrollments])

  // ── Right panel content based on selection ──
  const panelRows = useMemo(() => {
    if (!selectedItem) return []
    const users = enrolledUsers

    if (selectedItem.kind === 'video') {
      const vid = selectedItem.video
      return users.map(u => {
        const prog = userProgress.find(p => p.user_id === u.id && p.video_id === vid.id)
        return { user: u, watched: prog?.completed ?? false }
      }).sort((a, b) => (b.watched ? 1 : 0) - (a.watched ? 1 : 0))
    }

    if (selectedItem.kind === 'quiz') {
      const qid = selectedItem.quiz.id
      const rows = users.map(u => {
        const sub = quizSubs.find(s => s.user_id === u.id && s.quiz_id === qid)
        return { user: u, sub: sub || null, score: sub ? pct(sub.score, sub.total) : -1 }
      })
      return rows.sort((a, b) => {
        if (gradeSort === 'highest') return b.score - a.score
        if (gradeSort === 'lowest')  return a.score - b.score
        return (a.user.full_name || '').localeCompare(b.user.full_name || '', 'ar')
      })
    }

    if (selectedItem.kind === 'exam') {
      const eid = selectedItem.exam.id
      const rows = users.map(u => {
        const sub = examSubs.find(s => s.user_id === u.id && s.exam_id === eid)
        return { user: u, sub: sub || null, score: sub ? pct(sub.score, sub.total) : -1 }
      })
      return rows.sort((a, b) => {
        if (gradeSort === 'highest') return b.score - a.score
        if (gradeSort === 'lowest')  return a.score - b.score
        return (a.user.full_name || '').localeCompare(b.user.full_name || '', 'ar')
      })
    }

    if (selectedItem.kind === 'module') {
      const mod = selectedItem.module
      return users.map(u => {
        const enrollment = enrollments.find(e => e.user_profiles?.id === u.id)
        const vidsDone = mod.videos.filter(v =>
          userProgress.find(p => p.user_id === u.id && p.video_id === v.id && p.completed)
        ).length
        const quizAvg = mod.quizzes.length
          ? (() => {
              const subs = mod.quizzes.map(q => quizSubs.find(s => s.user_id === u.id && s.quiz_id === q.id)).filter(Boolean) as QuizSub[]
              return subs.length ? Math.round(subs.reduce((a, s) => a + pct(s.score, s.total), 0) / subs.length) : null
            })()
          : null
        const examSub = mod.exam ? examSubs.find(s => s.user_id === u.id && s.exam_id === mod.exam!.id) : null
        return { user: u, vidsDone, totalVids: mod.videos.length, quizAvg, examSub, enrollment }
      })
    }

    return []
  }, [selectedItem, enrolledUsers, userProgress, quizSubs, examSubs, enrollments, gradeSort])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return panelRows
    const q = search.toLowerCase()
    return panelRows.filter((r: any) =>
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.user?.phone_number?.toLowerCase().includes(q)
    )
  }, [panelRows, search])

  // Stats summary
  const stats = useMemo(() => ({
    total: enrollments.length,
    completed: enrollments.filter(e => e.completed).length,
    avgProgress: enrollments.length
      ? Math.round(enrollments.reduce((a, e) => a + (e.progress_percentage ?? 0), 0) / enrollments.length) : 0,
    totalQuizSubs: quizSubs.length,
    totalExamSubs: examSubs.length,
  }), [enrollments, quizSubs, examSubs])

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-theme-secondary animate-pulse">جاري التحميل...</p>
      </div>
    </div>
  )

  if (error || !course) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-red-500 text-lg font-bold mb-4">{error || 'الكورس غير موجود'}</p>
        <Link href="/admin/courses" className="text-primary hover:underline">← العودة للكورسات</Link>
      </div>
    </div>
  )

  const selectedLabel = selectedItem
    ? selectedItem.kind === 'video' ? selectedItem.video.title
    : selectedItem.kind === 'quiz'  ? selectedItem.quiz.title
    : selectedItem.kind === 'exam'  ? selectedItem.exam.title
    : selectedItem.module.title
    : null

  const isGradable = selectedItem?.kind === 'quiz' || selectedItem?.kind === 'exam'

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Back */}
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-5 transition-colors text-sm font-semibold">
        ← العودة للكورسات
      </Link>

      {/* Header */}
      <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden mb-5">
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }} />
        <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-xl font-black text-theme-primary">{course.title}</h1>
              {course.published
                ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">منشور</span>
                : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30">مسودة</span>}
              {course.is_free && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30">مجاني</span>}
            </div>
            <p className="text-theme-secondary text-xs">اضغط على أي عنصر في هيكل الكورس لعرض إحصائياته</p>
          </div>
          <Link href={`/admin/courses/${courseId}/edit`} className="px-4 py-2 text-white text-sm font-bold rounded-xl" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
            تعديل الكورس
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'إجمالي المشتركين', value: stats.total, icon: '👥' },
          { label: 'أكملوا الكورس', value: stats.completed, icon: '✅' },
          { label: 'متوسط التقدم', value: `${stats.avgProgress}%`, icon: '📈' },
          { label: 'كويزات مُقدَّمة', value: stats.totalQuizSubs, icon: '📝' },
          { label: 'امتحانات مُقدَّمة', value: stats.totalExamSubs, icon: '📋' },
        ].map(s => (
          <div key={s.label} className="bg-theme-card rounded-xl border border-[var(--border-color)] p-3 text-center">
            <div className="text-xl mb-0.5">{s.icon}</div>
            <p className="text-xl font-black text-theme-primary">{s.value}</p>
            <p className="text-theme-secondary text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 items-start">

        {/* LEFT PANEL — Course Structure */}
        <div className="w-72 flex-shrink-0 bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-[var(--border-color)]" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
            <p className="text-white font-black text-sm">هيكل الكورس</p>
            <p className="text-white/70 text-xs">{modules.length} وحدة</p>
          </div>
          <div className="overflow-y-auto max-h-[70vh]">
            {modules.length === 0 ? (
              <p className="p-4 text-theme-muted text-sm text-center">لا يوجد محتوى</p>
            ) : modules.map(mod => {
              const isOpen = expandedModules.has(mod.id)
              const isModSel = selectedItem?.kind === 'module' && selectedItem.module.id === mod.id
              return (
                <div key={mod.id}>
                  {/* Module header */}
                  <div
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer select-none border-b border-[var(--border-color)] transition-colors ${isModSel ? 'bg-primary/10' : 'hover:bg-[var(--bg-card-alt)]'}`}
                    onClick={() => { setSelectedItem({ kind: 'module', module: mod }); toggleModule(mod.id) }}
                  >
                    <span className="text-base">{mod.module_type === 'exam' ? '📋' : '📁'}</span>
                    <span className="flex-1 text-theme-primary text-xs font-bold truncate">{mod.title}</span>
                    <span className={`text-theme-muted text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                  </div>

                  {/* Module children */}
                  {isOpen && (
                    <div className="bg-[var(--bg-card-alt)]">
                      {mod.videos.map(vid => {
                        const isSel = selectedItem?.kind === 'video' && selectedItem.video.id === vid.id
                        const watchedCount = userProgress.filter(p => p.video_id === vid.id && p.completed).length
                        return (
                          <div
                            key={vid.id}
                            onClick={() => setSelectedItem({ kind: 'video', video: vid, module: mod })}
                            className={`flex items-center gap-2 pl-8 pr-4 py-2.5 cursor-pointer border-b border-[var(--border-color)] transition-colors ${isSel ? 'bg-primary/10 border-r-2 border-r-primary' : 'hover:bg-[var(--bg-input)]'}`}
                          >
                            <span className="text-sm">🎬</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-theme-primary text-xs truncate">{vid.title}</p>
                              {vid.duration && <p className="text-theme-muted text-xs">{fmt(vid.duration)}</p>}
                            </div>
                            <span className="text-theme-muted text-xs flex-shrink-0">{watchedCount}</span>
                          </div>
                        )
                      })}

                      {mod.quizzes.map(quiz => {
                        const isSel = selectedItem?.kind === 'quiz' && selectedItem.quiz.id === quiz.id
                        const subCount = quizSubs.filter(s => s.quiz_id === quiz.id).length
                        const avgPct = subCount
                          ? Math.round(quizSubs.filter(s => s.quiz_id === quiz.id).reduce((a, s) => a + pct(s.score, s.total), 0) / subCount)
                          : null
                        return (
                          <div
                            key={quiz.id}
                            onClick={() => setSelectedItem({ kind: 'quiz', quiz, module: mod })}
                            className={`flex items-center gap-2 pl-8 pr-4 py-2.5 cursor-pointer border-b border-[var(--border-color)] transition-colors ${isSel ? 'bg-primary/10 border-r-2 border-r-primary' : 'hover:bg-[var(--bg-input)]'}`}
                          >
                            <span className="text-sm">📝</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-theme-primary text-xs truncate">{quiz.title}</p>
                              <p className="text-theme-muted text-xs">{subCount} إجابة {avgPct !== null ? `· متوسط ${avgPct}%` : ''}</p>
                            </div>
                          </div>
                        )
                      })}

                      {mod.exam && (() => {
                        const isSel = selectedItem?.kind === 'exam' && selectedItem.exam.id === mod.exam!.id
                        const subCount = examSubs.filter(s => s.exam_id === mod.exam!.id).length
                        const avgPct = subCount
                          ? Math.round(examSubs.filter(s => s.exam_id === mod.exam!.id).reduce((a, s) => a + pct(s.score, s.total), 0) / subCount)
                          : null
                        return (
                          <div
                            key={mod.exam.id}
                            onClick={() => setSelectedItem({ kind: 'exam', exam: mod.exam!, module: mod })}
                            className={`flex items-center gap-2 pl-8 pr-4 py-2.5 cursor-pointer border-b border-[var(--border-color)] transition-colors ${isSel ? 'bg-primary/10 border-r-2 border-r-primary' : 'hover:bg-[var(--bg-input)]'}`}
                          >
                            <span className="text-sm">📋</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-theme-primary text-xs truncate">{mod.exam.title}</p>
                              <p className="text-theme-muted text-xs">{subCount} إجابة {avgPct !== null ? `· متوسط ${avgPct}%` : ''}</p>
                            </div>
                          </div>
                        )
                      })()}

                      {mod.videos.length === 0 && mod.quizzes.length === 0 && !mod.exam && (
                        <p className="pl-8 pr-4 py-2.5 text-theme-muted text-xs">لا يوجد محتوى</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — Detail view */}
        <div className="flex-1 min-w-0">
          {!selectedItem ? (
            <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-16 text-center">
              <div className="text-5xl mb-4">👈</div>
              <p className="text-theme-secondary font-semibold">اختر عنصراً من هيكل الكورس</p>
              <p className="text-theme-muted text-sm mt-1">فيديو أو كويز أو امتحان أو وحدة كاملة</p>
            </div>
          ) : (
            <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {selectedItem.kind === 'video' ? '🎬'
                      : selectedItem.kind === 'quiz' ? '📝'
                      : selectedItem.kind === 'exam' ? '📋' : '📁'}
                    </span>
                    <h2 className="text-theme-primary font-black text-base">{selectedLabel}</h2>
                  </div>
                  <p className="text-theme-secondary text-xs mt-0.5">
                    {selectedItem.kind === 'module' ? selectedItem.module.title
                    : selectedItem.kind !== 'module' ? `وحدة: ${selectedItem.module.title}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary text-xs">🔍</span>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="ابحث..."
                      className="pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary text-xs outline-none w-36"
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted text-xs">✕</button>}
                  </div>
                  {/* Sort (only for quizzes/exams) */}
                  {isGradable && (
                    <select
                      value={gradeSort}
                      onChange={e => setGradeSort(e.target.value as typeof gradeSort)}
                      className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary text-xs outline-none"
                    >
                      <option value="highest">⬆ أعلى درجة</option>
                      <option value="lowest">⬇ أدنى درجة</option>
                      <option value="name">أ-ي الاسم</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Summary bar for quiz/exam */}
              {isGradable && (() => {
                const allSubs = selectedItem.kind === 'quiz'
                  ? quizSubs.filter(s => s.quiz_id === selectedItem.quiz.id)
                  : examSubs.filter(s => s.exam_id === selectedItem.exam.id)
                const submitted = allSubs.length
                const notSubmitted = enrolledUsers.length - submitted
                const avg = submitted ? Math.round(allSubs.reduce((a, s) => a + pct(s.score, s.total), 0) / submitted) : 0
                const passing = allSubs.filter(s => pct(s.score, s.total) >= 60).length
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-[var(--border-color)]">
                    {[
                      { label: 'قدّموا', value: submitted, color: 'text-green-500' },
                      { label: 'لم يُقدِّموا', value: notSubmitted, color: 'text-red-500' },
                      { label: 'متوسط الدرجات', value: `${avg}%`, color: avg >= 60 ? 'text-green-500' : 'text-red-500' },
                      { label: 'ناجحون (+60%)', value: passing, color: 'text-primary' },
                    ].map((s, i) => (
                      <div key={i} className="p-3 text-center border-l border-[var(--border-color)] last:border-0 first:border-0">
                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                        <p className="text-theme-muted text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Video summary bar */}
              {selectedItem.kind === 'video' && (() => {
                const watched = userProgress.filter(p => p.video_id === selectedItem.video.id && p.completed).length
                const notWatched = enrolledUsers.length - watched
                const watchPct = enrolledUsers.length ? Math.round((watched / enrolledUsers.length) * 100) : 0
                return (
                  <div className="grid grid-cols-3 gap-0 border-b border-[var(--border-color)]">
                    {[
                      { label: 'شاهدوا الفيديو', value: watched, color: 'text-green-500' },
                      { label: 'لم يشاهدوا', value: notWatched, color: 'text-red-500' },
                      { label: 'نسبة المشاهدة', value: `${watchPct}%`, color: 'text-primary' },
                    ].map((s, i) => (
                      <div key={i} className="p-3 text-center border-l border-[var(--border-color)] last:border-0 first:border-0">
                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                        <p className="text-theme-muted text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Rows */}
              <div className="divide-y divide-[var(--border-color)] overflow-y-auto max-h-[55vh]">
                {filteredRows.length === 0 ? (
                  <p className="p-8 text-center text-theme-muted text-sm">لا يوجد بيانات</p>
                ) : filteredRows.map((row: any, i: number) => {
                  const user: UserProfile = row.user

                  // VIDEO ROW
                  if (selectedItem.kind === 'video') {
                    return (
                      <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-theme-muted text-xs w-5">{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#FD1D1D,#FCB045)' }}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-theme-primary text-sm font-semibold truncate">{user.full_name}</p>
                          <p className="text-theme-muted text-xs font-mono">{user.phone_number}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {row.watched
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">✓ شاهد</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--border-color)] text-theme-muted">لم يشاهد</span>
                          }
                        </div>
                        <Link href={`/admin/users/${user.id}`} onClick={e => e.stopPropagation()} className="px-2 py-1 text-xs font-bold rounded-lg text-white flex-shrink-0" style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
                          ملفه
                        </Link>
                      </div>
                    )
                  }

                  // QUIZ / EXAM ROW
                  if (selectedItem.kind === 'quiz' || selectedItem.kind === 'exam') {
                    const sub: QuizSub | ExamSub | null = row.sub
                    const score = row.score
                    return (
                      <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-theme-muted text-xs w-5 flex-shrink-0">{sub ? i + 1 : '—'}</span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: score >= 80 ? '#22c55e' : score >= 60 ? 'linear-gradient(135deg,#FCB045,#FD1D1D)' : score >= 0 ? '#ef4444' : '#6b7280' }}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-theme-primary text-sm font-semibold truncate">{user.full_name}</p>
                          <p className="text-theme-muted text-xs font-mono">{user.phone_number}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {sub
                            ? <>
                                <ScorePill score={sub.score} total={sub.total} />
                                <p className="text-theme-muted text-xs mt-0.5">
                                  {new Date(sub.submitted_at).toLocaleDateString('ar-EG')}
                                </p>
                              </>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--border-color)] text-theme-muted">لم يُقدَّم</span>
                          }
                        </div>
                        <Link href={`/admin/users/${user.id}`} onClick={e => e.stopPropagation()} className="px-2 py-1 text-xs font-bold rounded-lg text-white flex-shrink-0" style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
                          ملفه
                        </Link>
                      </div>
                    )
                  }

                  // MODULE ROW (overview)
                  if (selectedItem.kind === 'module') {
                    return (
                      <div key={user.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                        <span className="text-theme-muted text-xs w-5 flex-shrink-0">{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#FD1D1D,#FCB045)' }}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <p className="text-theme-primary text-sm font-semibold truncate">{user.full_name}</p>
                          <p className="text-theme-muted text-xs font-mono">{user.phone_number}</p>
                        </div>
                        {row.totalVids > 0 && (
                          <div className="text-center min-w-[80px]">
                            <p className="text-theme-muted text-xs mb-0.5">فيديوهات</p>
                            <p className="text-theme-primary text-xs font-bold">{row.vidsDone}/{row.totalVids}</p>
                          </div>
                        )}
                        {row.quizAvg !== null && (
                          <div className="text-center min-w-[80px]">
                            <p className="text-theme-muted text-xs mb-0.5">متوسط الكويزات</p>
                            <MiniBar value={row.quizAvg} />
                          </div>
                        )}
                        {row.examSub && (
                          <div className="text-center min-w-[80px]">
                            <p className="text-theme-muted text-xs mb-0.5">الامتحان</p>
                            <ScorePill score={row.examSub.score} total={row.examSub.total} />
                          </div>
                        )}
                        <Link href={`/admin/users/${user.id}`} onClick={e => e.stopPropagation()} className="px-2 py-1 text-xs font-bold rounded-lg text-white flex-shrink-0" style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
                          ملفه
                        </Link>
                      </div>
                    )
                  }

                  return null
                })}
              </div>

              {search && (
                <p className="px-5 py-2 text-theme-muted text-xs border-t border-[var(--border-color)]">
                  يظهر {filteredRows.length} من {panelRows.length}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
