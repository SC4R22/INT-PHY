// Loading skeleton for /dashboard/courses/[id]
export default function CourseViewLoading() {
  return (
    <div className="min-h-screen bg-[#25292D] flex animate-pulse">

      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-r-2 border-[#3A3A3A] bg-[#1e2125] flex-shrink-0">
        {/* Course title */}
        <div className="p-6 border-b border-[#3A3A3A] space-y-3">
          <div className="h-7 bg-[#3A3A3A] rounded-lg w-5/6" />
          <div className="h-7 bg-[#3A3A3A] rounded-lg w-3/4" />
          {/* Progress bar */}
          <div className="h-2 bg-[#3A3A3A] rounded-full w-full mt-2" />
          <div className="h-4 w-24 bg-[#3A3A3A] rounded" />
        </div>

        {/* Module list */}
        <div className="p-4 space-y-2 flex-1 overflow-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              {/* Module header */}
              <div className="flex items-center justify-between px-3 py-3 bg-[#2A2A2A] rounded-xl">
                <div className="h-5 w-40 bg-[#3A3A3A] rounded" />
                <div className="h-4 w-4 bg-[#3A3A3A] rounded" />
              </div>
              {/* Video rows */}
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3 px-4 py-2.5 ml-2">
                  <div className="w-5 h-5 rounded-full bg-[#3A3A3A] flex-shrink-0" />
                  <div className="h-4 bg-[#3A3A3A] rounded flex-1" />
                  <div className="h-3 w-10 bg-[#3A3A3A] rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex-1 p-6 md:p-10 space-y-6">
        <div className="h-8 w-64 bg-[#3A3A3A] rounded-xl" />
        <div className="h-4 w-40 bg-[#3A3A3A] rounded" />
        <div className="aspect-video bg-[#2A2A2A] rounded-2xl border-2 border-[#3A3A3A]" />
        <div className="space-y-2 mt-6">
          <div className="h-5 bg-[#3A3A3A] rounded w-full" />
          <div className="h-5 bg-[#3A3A3A] rounded w-5/6" />
          <div className="h-5 bg-[#3A3A3A] rounded w-4/6" />
        </div>
      </main>
    </div>
  )
}
