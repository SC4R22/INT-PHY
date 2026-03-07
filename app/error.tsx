'use client'

import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="bg-[var(--bg-primary)] flex items-center justify-center min-h-screen font-sans p-4">
      <div className="bg-[var(--bg-card)] rounded-2xl p-10 max-w-md w-full border-2 border-primary shadow-2xl shadow-primary/20 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold text-theme-primary mb-3">حصلت مشكلة</h2>
          <p className="text-sm font-mono text-red-400 bg-[var(--bg-card-alt)] px-4 py-3 rounded-xl mb-6 break-words text-left">
            {error.message || 'حدث خطأ غير متوقع'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all"
            >
              حاول تاني
            </button>
            <Link
              href="/"
              className="w-full py-3 bg-[var(--bg-card-alt)] text-theme-primary rounded-xl font-bold hover:bg-[var(--border-color)] transition-all text-center block"
            >
              الرئيسية
            </Link>
          </div>
      </div>
    </div>
  )
}
