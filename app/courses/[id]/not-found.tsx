import Link from 'next/link'

export default function CourseNotFound() {
  return (
    <div className="bg-[#25292D] min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl mb-6">📚</p>
        <h1 className="text-5xl font-payback font-bold text-[#EFEFEF] mb-4">Course Not Found</h1>
        <p className="text-[#B3B3B3] text-lg mb-8">This course doesn&apos;t exist or has been removed.</p>
        <Link href="/courses" className="btn btn-primary text-lg">Browse All Courses</Link>
      </div>
    </div>
  )
}
