// Loading skeleton for /courses
export default function CoursesLoading() {
  return (
    <div className="bg-[#25292D] min-h-screen animate-pulse">

      {/* Header bar skeleton */}
      <div className="bg-gradient-to-r from-primary/40 to-primary/20 py-16">
        <div className="container-custom text-center space-y-4">
          <div className="h-14 w-64 bg-white/10 rounded-xl mx-auto" />
          <div className="h-5 w-48 bg-white/10 rounded-lg mx-auto" />
        </div>
      </div>

      <div className="container-custom py-12">
        {/* Search bar skeleton */}
        <div className="mb-10 max-w-xl mx-auto">
          <div className="h-14 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded-xl" />
        </div>

        {/* Course grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#2A2A2A] rounded-2xl overflow-hidden border-2 border-[#3A3A3A] flex flex-col">
              {/* Thumbnail */}
              <div className="h-48 bg-[#3A3A3A]" />
              {/* Content */}
              <div className="p-6 space-y-3 flex-1">
                <div className="h-6 bg-[#3A3A3A] rounded-lg w-3/4" />
                <div className="h-4 bg-[#3A3A3A] rounded w-full" />
                <div className="h-4 bg-[#3A3A3A] rounded w-5/6" />
                <div className="h-4 bg-[#3A3A3A] rounded w-4/6" />
                <div className="pt-4 border-t border-[#3A3A3A] flex justify-between">
                  <div className="h-6 w-16 bg-[#3A3A3A] rounded" />
                  <div className="h-6 w-20 bg-[#3A3A3A] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
