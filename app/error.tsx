'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-[#25292D] flex items-center justify-center min-h-screen font-sans p-4">
        <div className="bg-[#2A2A2A] rounded-2xl p-10 max-w-md w-full border-2 border-primary shadow-2xl shadow-primary/20 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold text-[#EFEFEF] mb-3">Something went wrong</h2>
          <p className="text-sm font-mono text-red-400 bg-[#1a1a1a] px-4 py-3 rounded-xl mb-6 break-words text-left">
            {error.message || 'An unexpected error occurred'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all"
            >
              Try Again
            </button>
            <a
              href="/"
              className="w-full py-3 bg-[#3A3A3A] text-[#EFEFEF] rounded-xl font-bold hover:bg-[#4A4A4A] transition-all text-center"
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
