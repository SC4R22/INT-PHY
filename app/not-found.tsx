import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center px-4">
      <div className="text-center max-w-lg w-full">

        {/* Big 404 */}
        <div className="relative mb-6 select-none">
          <span className="text-[180px] md:text-[220px] font-payback font-bold leading-none text-[var(--bg-card-alt)]">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[180px] md:text-[220px] font-payback font-bold leading-none text-primary opacity-10 blur-sm">
            404
          </span>
        </div>

        {/* Icon */}
        <div className="text-6xl mb-6">🔭</div>

        {/* Text */}
        <h1 className="text-3xl md:text-4xl font-payback font-bold text-theme-primary mb-3 uppercase italic">
          الصفحة غير موجودة
        </h1>
        <p className="text-theme-secondary text-lg mb-10 leading-relaxed">
          الصفحة دي مش موجودة أو اتنقلت. خلينا نرجعك للصح.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn btn-primary text-base">
            ← الرئيسية
          </Link>
          <Link href="/courses" className="btn btn-secondary text-base">
            تصفح الكورسات
          </Link>
        </div>
      </div>
    </div>
  )
}
