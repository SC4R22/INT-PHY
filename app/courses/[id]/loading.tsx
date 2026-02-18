// Loading skeleton for /courses/[id]
export default function CourseDetailLoading() {
  return (
    <div className="bg-[#25292D] min-h-screen animate-pulse">

      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-primary/20 via-[#1e2125] to-[#25292D] border-b-2 border-primary/10">
        <div className="container-custom py-16">
          <div className="grid lg:grid-cols-3 gap-12 items-start">

            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Badge */}
              <div className="h-6 w-28 bg-primary/20 rounded-full" />
              {/* Title */}
              <div className="space-y-3">
                <div className="h-12 bg-[#3A3A3A] rounded-xl w-4/5" />
                <div className="h-12 bg-[#3A3A3A] rounded-xl w-3/5" />
              </div>
              {/* Description */}
              <div className="space-y-2">
                <div className="h-5 bg-[#3A3A3A] rounded w-full" />
                <div className="h-5 bg-[#3A3A3A] rounded w-5/6" />
                <div className="h-5 bg-[#3A3A3A] rounded w-4/6" />
              </div>
              {/* Stats */}
              <div className="flex gap-6 pt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#3A3A3A] rounded-lg" />
                    <div className="space-y-1">
                      <div className="h-4 w-8 bg-[#3A3A3A] rounded" />
                      <div className="h-3 w-14 bg-[#3A3A3A] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — enroll card */}
            <div className="lg:col-span-1">
              <div className="bg-[#2A2A2A] rounded-2xl p-6 border-2 border-[#3A3A3A] space-y-4">
                <div className="h-10 w-32 bg-[#3A3A3A] rounded-xl mx-auto" />
                <div className="h-14 bg-[#3A3A3A] rounded-xl" />
                <div className="pt-4 border-t border-[#3A3A3A] space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-4 bg-[#3A3A3A] rounded w-3/4" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum skeleton */}
      <div className="container-custom py-16">
        <div className="h-10 w-56 bg-[#3A3A3A] rounded-xl mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-[#3A3A3A]">
              <div className="px-6 py-4 bg-[#3A3A3A] flex justify-between">
                <div className="h-6 w-40 bg-[#4A4A4A] rounded" />
                <div className="h-6 w-16 bg-[#4A4A4A] rounded" />
              </div>
              <div className="divide-y divide-[#3A3A3A]">
                {[1, 2, 3].map(j => (
                  <div key={j} className="flex items-center justify-between px-6 py-3">
                    <div className="h-4 w-48 bg-[#3A3A3A] rounded" />
                    <div className="h-4 w-12 bg-[#3A3A3A] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
