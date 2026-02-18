// Loading skeleton for /dashboard
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#25292D] animate-pulse">

      {/* Header skeleton */}
      <div className="bg-[#1e2125] border-b-2 border-[#3A3A3A]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="h-7 w-24 bg-[#3A3A3A] rounded-lg" />
          <div className="hidden md:flex gap-2">
            <div className="h-9 w-24 bg-[#3A3A3A] rounded-lg" />
            <div className="h-9 w-32 bg-[#3A3A3A] rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#3A3A3A]" />
            <div className="h-4 w-24 bg-[#3A3A3A] rounded hidden sm:block" />
            <div className="h-8 w-20 bg-[#3A3A3A] rounded-lg" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Top row: Continue Watching + Get New Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Continue watching skeleton */}
          <div className="bg-[#2A2A2A] rounded-2xl border-2 border-[#3A3A3A] min-h-[280px]" />
          {/* Get new courses skeleton */}
          <div className="bg-[#2A2A2A] rounded-2xl border-2 border-[#3A3A3A] min-h-[280px]" />
        </div>

        {/* Your Courses heading */}
        <div className="h-12 w-56 bg-[#3A3A3A] rounded-xl mb-6" />

        {/* Course cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#2A2A2A] rounded-2xl border-2 border-[#3A3A3A] p-6 space-y-4">
              <div className="h-7 bg-[#3A3A3A] rounded-lg w-3/4 mx-auto" />
              <div className="space-y-2">
                <div className="h-3 bg-[#3A3A3A] rounded w-full" />
                <div className="h-3 bg-[#3A3A3A] rounded w-5/6" />
                <div className="h-3 bg-[#3A3A3A] rounded w-4/6" />
              </div>
              <div className="h-2 bg-[#3A3A3A] rounded-full w-full" />
              <div className="h-4 w-20 bg-[#3A3A3A] rounded mx-auto" />
              <div className="h-12 bg-[#3A3A3A] rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
