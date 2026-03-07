// Loading skeleton for /courses
export default function CoursesLoading() {
  return (
    <div className="bg-theme-primary min-h-screen animate-pulse">
      <div className="bg-gradient-to-r from-primary/40 to-primary/20 py-16">
        <div className="container-custom text-center space-y-4">
          <div className="h-14 w-64 bg-white/10 rounded-xl mx-auto" />
          <div className="h-5 w-48 bg-white/10 rounded-lg mx-auto" />
        </div>
      </div>
      <div className="container-custom py-12">
        <div className="mb-10 max-w-xl mx-auto">
          <div className="h-14 bg-[var(--bg-card-alt)] border-2 border-[var(--border-color)] rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-theme-card rounded-2xl overflow-hidden border-2 border-[var(--border-color)] flex flex-col">
              <div className="h-48 bg-[var(--bg-card-alt)]" />
              <div className="p-6 space-y-3 flex-1">
                <div className="h-6 bg-[var(--bg-card-alt)] rounded-lg w-3/4" />
                <div className="h-4 bg-[var(--bg-card-alt)] rounded w-full" />
                <div className="h-4 bg-[var(--bg-card-alt)] rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
