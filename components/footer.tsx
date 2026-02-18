import Link from 'next/link'

export function Footer() {
  const footerLinks = {
    company: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
    resources: [
      { name: 'Courses', href: '/courses' },
      { name: 'Help Center', href: '/help' },
      { name: 'FAQ', href: '/faq' },
    ],
  }

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-light-bg-secondary dark:bg-dark-bg">
      <div className="container-custom py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-payback font-bold text-primary">
                Physics
              </span>
            </Link>
            <p className="text-sm text-light-body/70 dark:text-dark-body/70 max-w-xs">
              Master physics concepts with expert instruction and interactive learning materials.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-light-header dark:text-dark-header mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-light-body/70 dark:text-dark-body/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-light-header dark:text-dark-header mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-light-body/70 dark:text-dark-body/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-center text-light-body/70 dark:text-dark-body/70">
            &copy; {new Date().getFullYear()} Physics Learning Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
