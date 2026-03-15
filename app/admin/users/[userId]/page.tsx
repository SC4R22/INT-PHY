'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string
  phone_number: string
  parent_name: string | null
  parent_phone_number: string | null
  role: string
  created_at: string
  is_banned: boolean
  grade: string | null
  email: string | null
}

interface Enrollment {
  id: string
  enrolled_at: string
  completed: boolean
  progress_percentage: number
  courses: {
    id: string
    title: string
    thumbnail_url: string | null
  } | null
}

interface QuizSubmission {
  id: string
  score: number
  total: number
  submitted_at: string
  quizzes: {
    id: string
    title: string
    modules: {
      id: string
      title: string
      courses: {
        id: string
        title: string
      } | null
    } | null
  } | null
}

interface ExamSubmission {
  id: string
  score: number
  total: number
  submitted_at: string
  module_exams: {
    id: string
    title: string
    modules: {
      id: string
      title: string
      courses: {
        id: string
        title: string
      } | null
    } | null
  } | null
}

const gradeLabels: Record<string, string> = {
  prep_1: 'الأول إعدادي',
  prep_2: 'الثاني إعدادي',
  prep_3: 'الثالث إعدادي',
  sec_1: 'الأول ثانوي',
  sec_2: 'الثاني ثانوي',
  sec_3: 'الثالث ثانوي',
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  if (!total) return <span className="text-theme-muted text-sm">—</span>
  const pct = Math.round((score / total) * 100)
  const color =
    pct >= 80
      ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
      : pct >= 60
      ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
      : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      {score}/{total} — {pct}%
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)',
          }}
        />
      </div>
      <span className="text-xs text-theme-secondary font-semibold w-10 text-left">{value}%</span>
    </div>
  )
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([])
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'courses' | 'quizzes' | 'exams'>('courses')

  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setProfile(data.profile)
        setEnrollments(data.enrollments)
        setQuizSubmissions(data.quizSubmissions)
        setExamSubmissions(data.examSubmissions)
      })
      .catch(() => setError('فشل تحميل بيانات المستخدم'))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-theme-secondary">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg font-bold mb-4">{error || 'المستخدم غير موجود'}</p>
          <Link href="/admin/users" className="text-primary hover:underline">← العودة لإدارة المستخدمين</Link>
        </div>
      </div>
    )
  }

  const avgQuizScore = quizSubmissions.length
    ? Math.round(quizSubmissions.reduce((acc, q) => acc + (q.total ? (q.score / q.total) * 100 : 0), 0) / quizSubmissions.length)
    : null
  const avgExamScore = examSubmissions.length
    ? Math.round(examSubmissions.reduce((acc, e) => acc + (e.total ? (e.score / e.total) * 100 : 0), 0) / examSubmissions.length)
    : null

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary mb-6 transition-colors text-sm font-semibold"
      >
        ← العودة
      </Link>

      {/* Header Card */}
      <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden mb-6">
        <div className="h-2" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }} />
        <div className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)' }}
            >
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-theme-primary">{profile.full_name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  profile.is_banned
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                    : 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
                }`}>
                  {profile.is_banned ? 'محظور' : 'نشيط'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                  {profile.role}
                </span>
                {profile.grade && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30">
                    {gradeLabels[profile.grade] || profile.grade}
                  </span>
                )}
              </div>
              <p className="text-theme-secondary text-sm">
                انضم في {new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Student Info */}
        <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-5">
          <h2 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>👤</span> بيانات الطالب
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">الاسم الكامل</span>
              <span className="text-theme-primary font-semibold">{profile.full_name}</span>
            </div>
            <div className="h-px bg-[var(--border-color)]" />
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">رقم الهاتف</span>
              <a href={`tel:${profile.phone_number}`} className="text-primary font-mono font-semibold hover:underline">
                {profile.phone_number}
              </a>
            </div>
            {profile.email && (
              <>
                <div className="h-px bg-[var(--border-color)]" />
                <div className="flex items-center justify-between">
                  <span className="text-theme-secondary text-sm">البريد الإلكتروني</span>
                  <span className="text-theme-primary text-sm font-semibold truncate max-w-[200px]">{profile.email}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Parent Info */}
        <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-5">
          <h2 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>👨‍👩‍👦</span> بيانات ولي الأمر
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">اسم ولي الأمر</span>
              <span className="text-theme-primary font-semibold">
                {profile.parent_name || <span className="text-theme-muted italic text-sm">غير محدد</span>}
              </span>
            </div>
            <div className="h-px bg-[var(--border-color)]" />
            <div className="flex items-center justify-between">
              <span className="text-theme-secondary text-sm">رقم ولي الأمر</span>
              {profile.parent_phone_number ? (
                <a href={`tel:${profile.parent_phone_number}`} className="text-primary font-mono font-semibold hover:underline">
                  {profile.parent_phone_number}
                </a>
              ) : (
                <span className="text-theme-muted italic text-sm">غير محدد</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black text-theme-primary">{enrollments.length}</p>
          <p className="text-theme-secondary text-xs mt-1">كورس مسجل</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black text-theme-primary">
            {enrollments.filter(e => e.completed).length}
          </p>
          <p className="text-theme-secondary text-xs mt-1">كورس مكتمل</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black" style={avgQuizScore !== null ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
            {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
          </p>
          <p className="text-theme-secondary text-xs mt-1">متوسط الكويزات</p>
        </div>
        <div className="bg-theme-card rounded-xl border border-[var(--border-color)] p-4 text-center">
          <p className="text-3xl font-black" style={avgExamScore !== null ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
            {avgExamScore !== null ? `${avgExamScore}%` : '—'}
          </p>
          <p className="text-theme-secondary text-xs mt-1">متوسط الامتحانات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex border-b border-[var(--border-color)]">
          {([
            { key: 'courses', label: 'الكورسات', icon: '📚', count: enrollments.length },
            { key: 'quizzes', label: 'الكويزات', icon: '📝', count: quizSubmissions.length },
            { key: 'exams', label: 'الامتحانات', icon: '📋', count: examSubmissions.length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 px-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-[var(--bg-card-alt)]'
              }`}
              style={activeTab === tab.key ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--border-color)] text-theme-secondary'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            enrollments.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد كورسات مسجلة</div>
            ) : (
              <div className="space-y-3">
                {enrollments.map(enrollment => (
                  <div key={enrollment.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
                      📚
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">
                        {enrollment.courses?.title || 'كورس محذوف'}
                      </p>
                      <p className="text-theme-secondary text-xs mt-0.5">
                        تسجيل {new Date(enrollment.enrolled_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ProgressBar value={enrollment.progress_percentage ?? 0} />
                      {enrollment.completed && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
                          ✓ مكتمل
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
            quizSubmissions.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد كويزات مقدمة</div>
            ) : (
              <div className="space-y-3">
                {quizSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
                      📝
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">
                        {sub.quizzes?.title || 'كويز محذوف'}
                      </p>
                      <p className="text-theme-secondary text-xs mt-0.5">
                        {sub.quizzes?.modules?.courses?.title && (
                          <span className="font-medium">{sub.quizzes.modules.courses.title} ← </span>
                        )}
                        {sub.quizzes?.modules?.title}
                      </p>
                      <p className="text-theme-muted text-xs">
                        {new Date(sub.submitted_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <ScoreBadge score={sub.score} total={sub.total} />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            examSubmissions.length === 0 ? (
              <div className="py-12 text-center text-theme-muted">لا يوجد امتحانات مقدمة</div>
            ) : (
              <div className="space-y-3">
                {examSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border-color)]">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-semibold truncate">
                        {sub.module_exams?.title || 'امتحان محذوف'}
                      </p>
                      <p className="text-theme-secondary text-xs mt-0.5">
                        {sub.module_exams?.modules?.courses?.title && (
                          <span className="font-medium">{sub.module_exams.modules.courses.title} ← </span>
                        )}
                        {sub.module_exams?.modules?.title}
                      </p>
                      <p className="text-theme-muted text-xs">
                        {new Date(sub.submitted_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <ScoreBadge score={sub.score} total={sub.total} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
