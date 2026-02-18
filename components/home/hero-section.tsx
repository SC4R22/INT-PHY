import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative section-padding bg-gradient-to-br from-light-bg via-light-bg-secondary to-light-bg dark:from-dark-bg dark:via-dark-bg/95 dark:to-dark-bg overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10 dark:opacity-20">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-block">
              <span className="text-6xl lg:text-8xl font-payback font-bold text-light-header dark:text-dark-header">
                MR.ESLAM RABEA
              </span>
            </div>

            <div>
              <h1 className="text-5xl lg:text-7xl font-payback font-bold text-gradient mb-4">
                Physics
              </h1>
              <p className="text-lg lg:text-xl text-light-body/80 dark:text-dark-body/80 max-w-xl">
                Master physics concepts with expert instruction, interactive materials, and comprehensive video courses designed for your success.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className="btn btn-primary text-lg">
                Sign up
              </Link>
              <Link href="/login" className="btn btn-secondary text-lg">
                Log in
              </Link>
            </div>
          </div>

          {/* Right content - Hero Image/Banner */}
          <div className="relative">
            <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              {/* Placeholder for teacher image - using Frame_56.png as reference */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-20 dark:opacity-30">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <pattern id="physics-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.3" />
                        <path d="M5,5 L15,15 M15,5 L5,15" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#physics-pattern)" />
                  </svg>
                </div>
                
                {/* Placeholder text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl lg:text-8xl font-payback font-bold text-primary opacity-80">
                    Physics
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary-400/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
