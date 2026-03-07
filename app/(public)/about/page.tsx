import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'عن الأستاذ أحمد بدوي — منصة المبدع',
  description:
    'تعرف على الأستاذ أحمد بدوي، مؤسس منصة المبدع. مدرس لغة عربية متميز لخدمة طلاب الثانوية العامة في مصر.',
  alternates: {
    canonical: 'https://int-phy.vercel.app/about',
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-payback font-bold text-center mb-8 text-primary">
        عن منصة المبدع
      </h1>
      <p className="text-center text-light-body dark:text-dark-body">
        جاري إضافة محتوى هذه الصفحة قريبًا
      </p>
    </div>
  )
}
