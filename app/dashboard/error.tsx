'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="bg-[#25292D] min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#2A2A2A] rounded-2xl p-10 max-w-md w-full border-2 border-primary shadow-2xl shadow-primary/20 text-center">
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-2xl font-bold text-[#EFEFEF] mb-2">خطأ في الداشبورد</h2>
        <p className="text-[#B3B3B3] mb-4 text-sm">حدث خطأ. إيه اللي حصل:</p>
        <p className="text-sm font-mono text-red-400 bg-[#1a1a1a] px-4 py-3 rounded-xl mb-6 break-words text-left">
          {error.message || 'Unknown error'}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all"
          >
            جرب تاني
          </button>
          <a
            href="/dashboard"
            className="w-full py-3 bg-[#3A3A3A] text-[#EFEFEF] rounded-xl font-bold hover:bg-[#4A4A4A] transition-all text-center"
          >
            إعادة تحميل الداشبورد
          </a>
        </div>
      </div>
    </div>
  )
}
