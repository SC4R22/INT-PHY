import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EnrollButton } from './enroll-button'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('title, description').eq('id', id).single()
  if (!course) return { title: 'الكورس غير موجود — المبدع' }
  return {
    title: `${course.title} — المبدع`,
    description: course.description ?? 'كورس لغة عربية مع الأستاذ أحمد بدوي.',
    openGraph: { title: `${course.title} — المبدع`, description: course.description ?? 'كورس لغة عربية مع الأستاذ أحمد بدوي.', type: 'website' },
  }
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).eq('published', true).is('deleted_at', null).single()
  if (error || !course) notFound()

  const { data: modules } = await supabase.from('modules').select('id, title, order_index, videos (id, title, duration, order_index)').eq('course_id', id).order('order_index')
  const { data: { user } } = await supabase.auth.getUser()

  let isEnrolled = false
  if (user) {
    const { data: enrollment } = await supabase.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', id).single()
    isEnrolled = !!enrollment
  }

  const totalVideos = modules?.reduce((acc, m) => acc + (m.videos?.length || 0), 0) || 0
  const totalDuration = modules?.reduce((acc, m) => acc + (m.videos?.reduce((s: number, v: any) => s + (v.duration || 0), 0) || 0), 0) || 0

  return (
    <div className="bg-theme-primary min-h-screen">
      <div className="bg-gradient-to-br from-primary/30 via-[var(--bg-nav)] to-[var(--bg-primary)] border-b-2 border-primary/20">
        <div className="container-custom py-10 md:py-16">
          <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${course.is_free ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                  {course.is_free ? 'كورس مجاني' : 'كورس مدفوع'}
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-6xl font-payback font-bold text-theme-primary leading-tight mb-4">{course.title}</h1>
                <p className="text-theme-secondary text-base md:text-lg leading-relaxed max-w-2xl">{course.description}</p>
              </div>
              <div className="flex flex-wrap gap-4 md:gap-6 pt-4">
                {[{ icon: '📚', val: modules?.length || 0, label: 'وحدات' }, { icon: '🎬', val: totalVideos, label: 'فيديوهات' }].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-theme-secondary">
                    <span className="text-2xl">{s.icon}</span>
                    <div><p className="text-theme-primary font-bold">{s.val}</p><p className="text-xs" dir="rtl">{s.label}</p></div>
                  </div>
                ))}
                {totalDuration > 0 && (
                  <div className="flex items-center gap-2 text-theme-secondary">
                    <span className="text-2xl">⏱️</span>
                    <div><p className="text-theme-primary font-bold">{Math.floor(totalDuration / 3600)}س {Math.floor((totalDuration % 3600) / 60)}د</p><p className="text-xs">المدة الكلية</p></div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-theme-card rounded-2xl p-5 md:p-6 border-2 border-primary/30 shadow-xl shadow-primary/10 lg:sticky lg:top-24">
                <div className="text-center mb-6">
                  <p className={`text-4xl font-payback font-bold mb-1 ${course.is_free ? 'text-green-400' : 'text-theme-primary'}`}>{course.is_free ? 'مجاني' : `${course.price_cash} جنيه`}</p>
                  {!course.is_free && <p className="text-theme-secondary text-sm">دفعة واحدة كاش</p>}
                </div>
                <EnrollButton courseId={id} courseTitle={course.title} isFree={course.is_free} isLoggedIn={!!user} isEnrolled={isEnrolled} />
                <div className="mt-6 space-y-3 pt-6 border-t border-[var(--border-color)]">
                  <p className="text-theme-secondary text-sm font-semibold uppercase tracking-wider">يشمل</p>
                  {[`${modules?.length || 0} وحدة`, `${totalVideos} فيديو`, 'وصول دائم', 'شاهد على أي جهاز'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-theme-primary text-sm"><span className="text-green-400">✓</span>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-16">
        <h2 className="text-3xl lg:text-4xl font-payback font-bold text-theme-primary mb-8">محتوى الكورس</h2>
        {!modules || modules.length === 0 ? (
          <div className="text-center py-16 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
            <p className="text-4xl mb-3">📋</p><p className="text-theme-secondary text-lg">جاري تجهيز المحتوى. تفضل عد لاحقًا.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod: any, modIndex: number) => (
              <div key={mod.id} className="bg-theme-card rounded-xl overflow-hidden border-2 border-[var(--border-color)]">
                <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-[var(--bg-card-alt)] gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{modIndex + 1}</span>
                    <h3 className="text-theme-primary font-bold truncate">{mod.title}</h3>
                  </div>
                  <span className="text-theme-secondary text-sm flex-shrink-0">{mod.videos?.length || 0} فيديو</span>
                </div>
                {mod.videos && mod.videos.length > 0 && (
                  <div className="divide-y divide-[var(--border-color)]">
                    {[...mod.videos].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).map((video: any, vidIndex: number) => (
                      <div key={video.id} className="flex items-center justify-between px-4 md:px-6 py-3 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <span className="text-primary text-sm w-5 flex-shrink-0">{vidIndex + 1}.</span>
                          <span className="text-lg md:text-2xl flex-shrink-0">🎬</span>
                          <span className={`text-sm truncate ${isEnrolled ? 'text-theme-primary' : 'text-theme-secondary'}`}>{video.title}</span>
                        </div>
                        {video.duration && <span className="text-theme-secondary text-xs flex-shrink-0">{Math.floor(video.duration / 60)}m {video.duration % 60}s</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
