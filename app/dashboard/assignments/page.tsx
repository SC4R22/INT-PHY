import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const admin = createAdminClient()

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const courseIds = (enrollments ?? []).map((e: any) => e.course_id)

  let assignments: any[] = []

  if (courseIds.length > 0) {
    const { data: homeworkModules } = await admin
      .from('modules')
      .select('id, title, course_id, courses:course_id(id, title)')
      .in('course_id', courseIds)
      .eq('module_type', 'homework')
      .order('created_at', { ascending: false })

    if (homeworkModules && homeworkModules.length > 0) {
      const moduleIds = homeworkModules.map((m: any) => m.id)

      const { data: exams } = await admin
        .from('module_exams')
        .select('id, title, module_id')
        .in('module_id', moduleIds)

      const examIds = (exams ?? []).map((e: any) => e.id)

      const { data: questions } = examIds.length
        ? await admin.from('exam_question_items').select('id, exam_id').in('exam_id', examIds)
        : { data: [] }

      const questionCountByExam: Record<string, number> = {}
      for (const q of questions ?? []) {
        questionCountByExam[q.exam_id] = (questionCountByExam[q.exam_id] || 0) + 1
      }

      const { data: submissions } = examIds.length
        ? await admin
            .from('module_exam_submissions')
            .select('exam_id, score, total, submitted_at')
            .eq('user_id', user.id)
            .in('exam_id', examIds)
        : { data: [] }

      const submissionByExam: Record<string, any> = {}
      for (const s of submissions ?? []) {
        submissionByExam[s.exam_id] = s
      }

      const examByModule: Record<string, any> = {}
      for (const e of exams ?? []) {
        examByModule[e.module_id] = e
      }

      assignments = homeworkModules.map((mod: any) => {
        const exam = examByModule[mod.id]
        const submission = exam ? submissionByExam[exam.id] : null
        return {
          moduleId: mod.id,
          moduleTitle: mod.title,
          courseId: (mod.courses as any)?.id,
          courseTitle: (mod.courses as any)?.title,
          examId: exam?.id ?? null,
          questionCount: exam ? (questionCountByExam[exam.id] || 0) : 0,
          submission: submission ?? null,
        }
      })
    }
  }

  const pending = assignments.filter(a => !a.submission && a.questionCount > 0)
  const completed = assignments.filter(a => !!a.submission)
  const empty = assignments.filter(a => a.questionCount === 0)

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-payback font-black text-theme-primary uppercase italic mb-2">الواجبات</h2>
          <p className="text-theme-secondary text-sm">كل الواجبات من الكورسات اللي اشتركت فيها</p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-theme-primary text-xl font-bold mb-2">مفيش واجبات لحد دلوقتي</p>
            <p className="text-theme-secondary text-sm mb-6">لما الأستاذ يضيف واجبات هتظهر هنا</p>
            <Link href="/dashboard" className="btn btn-primary">رجوع للداشبورد</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {pending.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                  واجبات منتظرة
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full border border-primary/30">{pending.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pending.map((a) => (
                    <Link key={a.moduleId} href={a.examId ? `/dashboard/exam/${a.examId}?type=homework` : '#'}
                      className="group bg-theme-card rounded-xl border-2 border-primary hover:border-primary/70 p-5 transition-all hover:scale-[1.02]">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full border border-primary/30 truncate max-w-[140px]">{a.courseTitle}</span>
                        <span className="text-xs text-theme-secondary whitespace-nowrap">{a.questionCount} سؤال</span>
                      </div>
                      <h4 className="text-theme-primary font-bold text-base mb-3 line-clamp-2">{a.moduleTitle}</h4>
                      <div className="flex items-center gap-2 text-primary text-sm font-bold">
                        <span>ابدأ الواجب</span>
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
                  واجبات مكتملة
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">{completed.length}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map((a) => {
                    const pct = a.submission ? Math.round((a.submission.score / a.submission.total) * 100) : 0
                    return (
                      <Link key={a.moduleId} href={a.examId ? `/dashboard/exam/${a.examId}?type=homework` : '#'}
                        className="group bg-theme-card rounded-xl border-2 border-green-500/40 hover:border-green-500/70 p-5 transition-all hover:scale-[1.02]">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/30 truncate max-w-[140px]">{a.courseTitle}</span>
                          <span className={`text-sm font-black ${pct >= 60 ? 'text-green-400' : 'text-red-400'}`}>{pct}%</span>
                        </div>
                        <h4 className="text-theme-primary font-bold text-base mb-1 line-clamp-2">{a.moduleTitle}</h4>
                        <p className="text-theme-secondary text-xs mb-3">
                          {a.submission.score} / {a.submission.total} صح •{' '}
                          {new Date(a.submission.submitted_at).toLocaleDateString('ar-EG')}
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

            {empty.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-theme-secondary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--border-color)] inline-block"></span>
                  قريباً
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {empty.map((a) => (
                    <div key={a.moduleId} className="bg-theme-card rounded-xl border-2 border-dashed border-[var(--border-color)] p-5 opacity-60">
                      <span className="px-2 py-0.5 bg-[var(--bg-card-alt)] text-theme-secondary text-xs font-bold rounded-full border border-[var(--border-color)] mb-3 inline-block">{a.courseTitle}</span>
                      <h4 className="text-theme-secondary font-bold text-base">{a.moduleTitle}</h4>
                      <p className="text-theme-muted text-xs mt-2">لسه مفيش أسئلة</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
