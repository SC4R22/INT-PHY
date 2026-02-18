// Loading skeleton for /dashboard/watch/[videoId]
export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-[#25292D] flex animate-pulse">

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Video player skeleton */}
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Fake play button */}
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[18px] border-l-white/30 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
            </div>
          </div>
          {/* Controls bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-3 gap-3">
            <div className="h-1 flex-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Video info */}
        <div className="px-6 py-5 border-b border-[#3A3A3A] space-y-3">
          <div className="h-7 w-2/3 bg-[#3A3A3A] rounded-lg" />
          <div className="h-4 w-24 bg-[#3A3A3A] rounded" />
        </div>

        {/* Up next */}
        <div className="px-6 py-4">
          <div className="h-4 w-16 bg-[#3A3A3A] rounded mb-3" />
          <div className="h-20 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded-xl" />
        </div>
      </div>

      {/* Sidebar skeleton */}
      <aside className="hidden xl:flex flex-col w-80 border-l-2 border-[#3A3A3A] bg-[#1e2125] flex-shrink-0">
        <div className="p-4 border-b border-[#3A3A3A] space-y-2">
          <div className="h-6 w-3/4 bg-[#3A3A3A] rounded-lg" />
          <div className="h-2 bg-[#3A3A3A] rounded-full w-full" />
          <div className="h-4 w-20 bg-[#3A3A3A] rounded" />
        </div>
        <div className="p-3 space-y-1 overflow-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-5 h-5 rounded-full bg-[#3A3A3A] flex-shrink-0" />
              <div className="h-4 bg-[#3A3A3A] rounded flex-1" />
              <div className="h-3 w-8 bg-[#3A3A3A] rounded" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
