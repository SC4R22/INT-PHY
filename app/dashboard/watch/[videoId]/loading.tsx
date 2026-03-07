// Loading skeleton for /dashboard/watch/[videoId]
export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-theme-primary flex animate-pulse">

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Video player skeleton */}
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[18px] border-l-white/30 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-3 gap-3">
            <div className="h-1 flex-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Video info */}
        <div className="px-6 py-5 border-b border-[var(--border-color)] space-y-3">
          <div className="h-7 w-2/3 bg-[var(--bg-card-alt)] rounded-lg" />
          <div className="h-4 w-24 bg-[var(--bg-card-alt)] rounded" />
        </div>

        {/* Up next */}
        <div className="px-6 py-4">
          <div className="h-4 w-16 bg-[var(--bg-card-alt)] rounded mb-3" />
          <div className="h-20 bg-[var(--bg-card-alt)] border-2 border-[var(--border-color)] rounded-xl" />
        </div>
      </div>

      {/* Sidebar skeleton */}
      <aside className="hidden xl:flex flex-col w-80 border-l-2 border-[var(--border-color)] bg-[var(--bg-nav)] flex-shrink-0">
        <div className="p-4 border-b border-[var(--border-color)] space-y-2">
          <div className="h-6 w-3/4 bg-[var(--bg-card-alt)] rounded-lg" />
          <div className="h-2 bg-[var(--bg-card-alt)] rounded-full w-full" />
          <div className="h-4 w-20 bg-[var(--bg-card-alt)] rounded" />
        </div>
        <div className="p-3 space-y-1 overflow-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-[var(--bg-card-alt)] flex-shrink-0" />
              <div className="h-4 bg-[var(--bg-card-alt)] rounded flex-1" />
              <div className="h-3 w-8 bg-[var(--bg-card-alt)] rounded" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
