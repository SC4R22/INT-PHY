import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'كورسات اللغة العربية — منصة المبدع',
  description: 'تصفح كل كورسات اللغة العربية المتاحة مع الأستاذ أحمد بدوي على منصة المبدع. دروس فيديو HD لطلاب الثانوية العامة.',
  alternates: { canonical: 'https://int-phy.vercel.app/courses' },
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let studentGrade: string | null = null
  if (user) {
    const { data: profileData } = await supabase.from('user_profiles').select('grade, role').eq('id', user.id).single()
    if (profileData?.role === 'student') studentGrade = profileData.grade || null
  }

  let query = supabase
    .from('courses')
    .select('id, title, description, price_cash, is_free, created_at, thumbnail_url, target_grade')
    .eq('published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (studentGrade) query = query.or(`target_grade.is.null,target_grade.eq.${studentGrade}`)
  if (q) query = query.ilike('title', `%${q}%`)

  const { data: courses, error } = await query

  return (
    <div className="bg-theme-primary min-h-screen">
      <div className="bg-gradient-to-r from-primary to-primary/70 py-10 md:py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-payback font-bold text-white mb-4">كل الكورسات</h1>
          <p className="text-white/80 text-base md:text-lg">اختار كورس وابدأ تتعلم دلوقتي</p>
        </div>
      </div>

      <div className="container-custom py-12">
        <form method="GET" className="mb-10 max-w-xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary text-xl">🔍</span>
            <input type="text" name="q" defaultValue={q || ''} placeholder="ابحث عن كورس..." suppressHydrationWarning
              className="w-full pl-12 pr-4 py-4 bg-theme-card border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted text-lg transition-colors" />
            {q && <Link href="/courses" className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary font-bold transition-colors">✕</Link>}
          </div>
        </form>

        {q && <p className="text-theme-secondary mb-6 text-center">{courses?.length || 0} نتيجة لـ &ldquo;{q}&rdquo;</p>}
        {error && <div className="text-center py-20"><p className="text-red-400 font-semibold">حدثت مشكلة في تحميل الكورسات. حاول تاني.</p></div>}

        {!error && (!courses || courses.length === 0) && (
          <div className="text-center py-24 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
            <p className="text-6xl mb-4">📚</p>
            <p className="text-theme-primary text-2xl font-bold mb-2">{q ? 'مفيش كورسات' : 'مفيش كورسات لحد دلوقتي'}</p>
            <p className="text-theme-secondary mb-6">{q ? `مفيش كورسات تطابق "‏${q}‏". جرب بحث تاني.` : 'الكورسات هتظهر هنا بعد النشر.'}</p>
            {q && <Link href="/courses" className="btn btn-primary">مسح البحث</Link>}
          </div>
        )}

        {courses && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`}
                className="group bg-theme-card rounded-2xl overflow-hidden border-2 border-[var(--border-color)] hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col">
                <div className="h-48 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  ) : (
                    <span className="text-5xl font-payback font-bold text-primary/50 select-none">مبدع</span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-theme-primary font-bold text-xl mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">{course.title}</h2>
                  <p className="text-theme-secondary text-sm leading-relaxed mb-5 flex-1 line-clamp-3">{course.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <span className={`font-bold text-xl ${course.is_free ? 'text-green-500' : 'text-theme-primary'}`}>
                      {course.is_free ? 'مجاني' : `${course.price_cash} جنيه`}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold text-sm group-hover:-translate-x-1 transition-transform">عرض <span>←</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
