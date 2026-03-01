import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Mr. Eslam Rabea — INTPHY Physics Teacher',
  description:
    'Learn about Mr. Eslam Rabea, the founder of INTPHY (Intelligent Physics). Experienced physics teacher serving Grade 11 & 12 students across Egypt.',
  alternates: {
    canonical: 'https://int-phy.vercel.app/about',
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-payback font-bold text-center mb-8 text-primary">
        About Physics Academy
      </h1>
      <p className="text-center text-light-body dark:text-dark-body">
        About page content will be added later
      </p>
    </div>
  )
}
