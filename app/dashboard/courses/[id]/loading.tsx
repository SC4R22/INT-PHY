// Loading skeleton for /dashboard/courses/[id]
export default function CourseViewLoading() {
  return (
    <div className="min-h-screen bg-theme-primary flex animate-pulse">

      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-r-2 border-[var(--border-color)] bg-[var(--bg-nav)] flex-shrink-0">
        <div className="p-6 border-b border-[var(--border-color)] space-y-3">
          <div className="h-7 bg-[var(--bg-card-alt)] rounded-lg w-5/6" />
          <div className="h-7 bg-[var(--bg-card-alt)] rounded-lg w-3/4" />
          <div className="h-2 bg-[var(--bg-card-alt)] rounded-full w-full mt-2" />
          <div className="h-4 w-24 bg-[var(--bg-card-alt)] rounded" />
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between px-3 py-3 bg-[var(--bg-card-alt)] rounded-xl">
                <div className="h-5 w-40 bg-[var(--border-color)] rounded" />
                <div className="h-4 w-4 bg-[var(--border-color)] rounded" />
              </div>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3 px-4 py-2.5 ml-2">
                  <div className="w-5 h-5 rounded-full bg-[var(--bg-card-alt)] flex-shrink-0" />
                  <div className="h-4 bg-[var(--bg-card-alt)] rounded flex-1" />
                  <div className="h-3 w-10 bg-[var(--bg-card-alt)] rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex-1 p-6 md:p-10 space-y-6">
        <div className="h-8 w-64 bg-[var(--bg-card-alt)] rounded-xl" />
        <div className="h-4 w-40 bg-[var(--bg-card-alt)] rounded" />
        <div className="aspect-video bg-[var(--bg-card-alt)] rounded-2xl border-2 border-[var(--border-color)]" />
        <div className="space-y-2 mt-6">
          <div className="h-5 bg-[var(--bg-card-alt)] rounded w-full" />
          <div className="h-5 bg-[var(--bg-card-alt)] rounded w-5/6" />
          <div className="h-5 bg-[var(--bg-card-alt)] rounded w-4/6" />
        </div>
      </main>
    </div>
  )
}
