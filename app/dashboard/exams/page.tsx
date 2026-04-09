import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const admin = createAdminClient()

  const { data: exams } = await admin
    .from('standalone_exams')
    .select('id, title, description, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const examIds = (exams ?? []).map((e: any) => e.id)

  const { data: questions } = examIds.length
    ? await admin.from('standalone_exam_questions').select('id, exam_id').in('exam_id', examIds)
    : { data: [] }

  const questionCountByExam: Record<string, number> = {}
  for (const q of questions ?? []) {
    questionCountByExam[q.exam_id] = (questionCountByExam[q.exam_id] || 0) + 1
  }

  const { data: submissions } = examIds.length
    ? await admin
        .from('standalone_exam_submissions')
        .select('exam_id, score, total, submitted_at')
        .eq('user_id', user.id)
        .in('exam_id', examIds)
    : { data: [] }

  const submissionByExam: Record<string, any> = {}
  for (const s of submissions ?? []) {
    submissionByExam[s.exam_id] = s
  }

  const enriched = (exams ?? []).map((e: any) => ({
    ...e,
    questionCount: questionCountByExam[e.id] || 0,
    submission: submissionByExam[e.id] ?? null,
  }))

  const pending = enriched.filter((e) => !e.submission && e.questionCount > 0)
  const completed = enriched.filter((e) => !!e.submission)

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-payback font-black text-theme-primary uppercase italic mb-2">الامتحانات</h2>
          <p className="text-theme-secondary text-sm">امتحانات الأستاذ — متاحة لكل الطلاب</p>
        </div>

        {enriched.length === 0 ? (
          <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-theme-primary text-xl font-bold mb-2">مفيش امتحانات دلوقتي</p>
            <p className="text-theme-secondary text-sm mb-6">لما الأستاذ ينشر امتحان هيظهر هنا</p>
            <Link href="/dashboard" className="btn btn-primary">رجوع للداشبورد</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {pending.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                  امتحانات جديدة
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">{pending.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pending.map((exam: any) => (
                    <Link key={exam.id} href={`/dashboard/standalone-exam/${exam.id}`}
                      className="group bg-theme-card rounded-xl border-2 border-yellow-500/40 hover:border-yellow-500 p-5 transition-all hover:scale-[1.02]">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">امتحان</span>
                        <span className="text-xs text-theme-secondary">{exam.questionCount} سؤال</span>
                      </div>
                      <h4 className="text-theme-primary font-bold text-base mb-2 line-clamp-2">{exam.title}</h4>
                      {exam.description && (
                        <p className="text-theme-secondary text-sm line-clamp-2 mb-3">{exam.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
                        <span>ابدأ الامتحان</span>
                        <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  امتحانات مكتملة
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">{completed.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map((exam: any) => {
                    const pct = Math.round((exam.submission.score / exam.submission.total) * 100)
                    return (
                      <Link key={exam.id} href={`/dashboard/standalone-exam/${exam.id}`}
                        className="group bg-theme-card rounded-xl border-2 border-green-500/40 hover:border-green-500/70 p-5 transition-all hover:scale-[1.02]">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/30">مكتمل</span>
                          <span className={`text-sm font-black ${pct >= 60 ? 'text-green-400' : 'text-red-400'}`}>{pct}%</span>
                        </div>
                        <h4 className="text-theme-primary font-bold text-base mb-1 line-clamp-2">{exam.title}</h4>
                        <p className="text-theme-secondary text-xs mb-3">
                          {exam.submission.score} / {exam.submission.total} صح •{' '}
                          {new Date(exam.submission.submitted_at).toLocaleDateString('ar-EG')}
                        </p>
                        <div className="w-full bg-[var(--bg-card-alt)] rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
