'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const GRADE_SECTIONS = [
  { value: 'sec_1', label: 'أول ثانوي',  color: 'border-blue-500',   headerColor: 'from-blue-700 to-blue-500',     icon: '1️⃣' },
  { value: 'sec_2', label: 'تاني ثانوي', color: 'border-green-500',  headerColor: 'from-green-700 to-green-500',   icon: '2️⃣' },
  { value: 'sec_3', label: 'تالت ثانوي', color: 'border-purple-500', headerColor: 'from-purple-700 to-purple-500', icon: '3️⃣' },
  { value: null,    label: 'كل الصفوف',  color: 'border-gray-500',   headerColor: 'from-gray-700 to-gray-600',     icon: '🌐' },
]

function CourseRow({ course }: { course: any }) {
  return (
    <tr className="hover:bg-[var(--bg-card-alt)] transition-colors">
      <td className="px-4 md:px-6 py-4">
        <div>
          <p className="text-theme-primary font-semibold">{course.title}</p>
          <p className="text-theme-secondary text-sm line-clamp-1">{course.description}</p>
        </div>
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className="flex gap-2 flex-wrap">
          {course.published
            ? <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">منشور</span>
            : <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">مسودة</span>}
          {course.is_free && <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">مجاني</span>}
        </div>
      </td>
      <td className="px-4 md:px-6 py-4 text-theme-primary">
        {course.is_free ? 'مجاني' : `${course.price_cash} جنيه`}
      </td>
      <td className="px-4 md:px-6 py-4 text-theme-secondary text-sm">
        {new Date(course.created_at).toLocaleDateString('ar-EG')}
      </td>
      <td className="px-4 md:px-6 py-4">
        <div className="flex justify-end gap-2 flex-wrap">
          <Link href={`/admin/courses/${course.id}/stats`}
            className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-400 border border-purple-500/30 text-sm font-semibold rounded transition-colors">
            📊 إحصائيات
          </Link>
          <Link href={`/admin/courses/${course.id}/edit`}
            className="px-3 py-1 text-white text-sm font-semibold rounded transition-colors"
            style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
            تعديل
          </Link>
          <Link href={`/admin/courses/${course.id}/content`}
            className="px-3 py-1 bg-primary text-white text-sm font-semibold rounded hover:bg-primary/80 transition-colors">
            المحتوى
          </Link>
        </div>
      </td>
    </tr>
  )
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Start all sections expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/courses')
      .then(r => r.json())
      .then(json => { setCourses(json.courses ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggle = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const grouped = {
    sec_1: courses.filter(c => c.target_grade === 'sec_1'),
    sec_2: courses.filter(c => c.target_grade === 'sec_2'),
    sec_3: courses.filter(c => c.target_grade === 'sec_3'),
    all:   courses.filter(c => !c.target_grade),
  }

  const tableHead = (
    <thead className="bg-[var(--bg-card-alt)] border-b border-[var(--border-color)]">
      <tr>
        <th className="px-4 md:px-6 py-3 text-right text-theme-secondary text-xs font-bold uppercase tracking-wider">عنوان الكورس</th>
        <th className="px-4 md:px-6 py-3 text-right text-theme-secondary text-xs font-bold uppercase tracking-wider">الحالة</th>
        <th className="px-4 md:px-6 py-3 text-right text-theme-secondary text-xs font-bold uppercase tracking-wider">السعر</th>
        <th className="px-4 md:px-6 py-3 text-right text-theme-secondary text-xs font-bold uppercase tracking-wider">تاريخ الإنشاء</th>
        <th className="px-4 md:px-6 py-3 text-left text-theme-secondary text-xs font-bold uppercase tracking-wider">الإجراءات</th>
      </tr>
    </thead>
  )

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">إدارة الكورسات</h1>
          <p className="text-theme-secondary">إنشاء وتعديل وحذف الكورسات</p>
        </div>
        <Link href="/admin/courses/new"
          className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/80 transition-all shadow-lg flex items-center justify-center gap-2">
          <span className="text-xl">+</span>
          <span>إنشاء كورس جديد</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'إجمالي الكورسات', value: courses.length, color: 'border-primary', textColor: 'text-theme-primary' },
          { label: 'منشور',           value: courses.filter(c => c.published).length,  color: 'border-green-500',  textColor: 'text-green-500' },
          { label: 'مسودة',           value: courses.filter(c => !c.published).length, color: 'border-yellow-500', textColor: 'text-yellow-500' },
          { label: 'كورسات مجانية',  value: courses.filter(c => c.is_free).length,    color: 'border-primary',    textColor: 'text-primary' },
        ].map(s => (
          <div key={s.label} className={`bg-theme-card rounded-lg p-4 border-2 ${s.color}`}>
            <p className="text-theme-secondary text-sm">{s.label}</p>
            <p className={`text-3xl font-bold ${s.textColor}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Grade Sections */}
      {loading ? (
        <div className="text-center py-16 text-theme-secondary animate-pulse">جاري التحميل...</div>
      ) : (
        <div className="space-y-4">
          {GRADE_SECTIONS.map(section => {
            const key = section.value ?? 'all'
            const sectionCourses = section.value ? grouped[section.value as keyof typeof grouped] : grouped.all
            const isCollapsed = !!collapsed[key]

            return (
              <div key={key} className={`bg-theme-card rounded-xl overflow-hidden border-2 ${section.color}`}>

                {/* Section Header — clickable to collapse */}
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={`w-full flex items-center justify-between px-4 md:px-6 py-4 bg-gradient-to-l ${section.headerColor} hover:opacity-95 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <h2 className="text-white font-black text-lg">{section.label}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                      {sectionCourses.length} كورس
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick add — stop propagation so it doesn't toggle collapse */}
                    <Link
                      href={`/admin/courses/new${section.value ? `?grade=${section.value}` : ''}`}
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/35 text-white text-xs font-bold rounded-lg transition-colors border border-white/30"
                    >
                      + إضافة
                    </Link>
                    {/* Chevron */}
                    <span className={`text-white text-lg transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}>
                      ▲
                    </span>
                  </div>
                </button>

                {/* Collapsible body */}
                {!isCollapsed && (
                  sectionCourses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        {tableHead}
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {sectionCourses.map(course => (
                            <CourseRow key={course.id} course={course} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-theme-muted text-sm mb-3">لا توجد كورسات لـ {section.label} بعد</p>
                      <Link
                        href={`/admin/courses/new${section.value ? `?grade=${section.value}` : ''}`}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-[var(--bg-card-alt)] text-theme-secondary text-sm font-semibold rounded-lg hover:text-theme-primary transition-colors border border-[var(--border-color)]"
                      >
                        + أنشئ أول كورس لهذا الصف
                      </Link>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
