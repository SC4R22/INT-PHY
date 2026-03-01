import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { ConditionalLayout } from '@/components/conditional-layout'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-payback',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://int-phy.vercel.app'),
  title: {
    default: 'INTPHY — Physics with Mr. Eslam Rabea | Intelligent Physics',
    template: '%s | INTPHY — Eslam Rabea Physics',
  },
  description:
    'INTPHY (Intelligent Physics) — Learn physics online with Mr. Eslam Rabea. Expert HD video lessons for Grade 11 & 12 students in Egypt. Centers in Faysl, October, and Dokki.',
  keywords: [
    'intphy',
    'intelligent physics',
    'eslam rabea',
    'eslam physics',
    'mr eslam rabea',
    'eslam rabea physics',
    'physics teacher egypt',
    'physics grade 11 egypt',
    'physics grade 12 egypt',
    'online physics lessons egypt',
    'فيزياء',
    'اسلام ربيع',
    'فيزياء اون لاين',
    'مستر اسلام ربيع',
  ],
  authors: [{ name: 'Mr. Eslam Rabea', url: 'https://int-phy.vercel.app' }],
  creator: 'Mr. Eslam Rabea',
  publisher: 'INTPHY',
  alternates: {
    canonical: 'https://int-phy.vercel.app',
  },
  openGraph: {
    title: 'INTPHY — Physics with Mr. Eslam Rabea | Intelligent Physics',
    description:
      'Learn physics with Mr. Eslam Rabea at INTPHY (Intelligent Physics). HD video lessons, structured modules, Grade 11 & 12 courses in Egypt.',
    url: 'https://int-phy.vercel.app',
    siteName: 'INTPHY — Intelligent Physics',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INTPHY — Physics with Mr. Eslam Rabea',
    description:
      'Learn physics with Mr. Eslam Rabea at INTPHY (Intelligent Physics). HD video lessons for Grade 11 & 12 in Egypt.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization',
      '@id': 'https://int-phy.vercel.app/#organization',
      name: 'INTPHY — Intelligent Physics',
      alternateName: ['intphy', 'intelligent physics', 'eslam physics'],
      url: 'https://int-phy.vercel.app',
      description:
        'INTPHY is an online physics education platform by Mr. Eslam Rabea, offering structured HD video lessons for Grade 11 and Grade 12 students in Egypt.',
      founder: {
        '@type': 'Person',
        name: 'Eslam Rabea',
        alternateName: ['Mr. Eslam Rabea', 'eslam rabea', 'اسلام ربيع'],
        jobTitle: 'Physics Teacher',
        knowsAbout: 'Physics',
      },
      location: [
        { '@type': 'Place', name: 'Faysl Center', addressLocality: 'Faysl', addressCountry: 'EG' },
        { '@type': 'Place', name: 'October Center', addressLocality: 'October', addressCountry: 'EG' },
        { '@type': 'Place', name: 'Dokki Center', addressLocality: 'Dokki', addressCountry: 'EG' },
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Physics Courses',
        itemListElement: [
          {
            '@type': 'Course',
            name: 'Grade 11 Physics',
            description: 'Physics curriculum for Grade 11 students in Egypt by Mr. Eslam Rabea.',
            provider: { '@type': 'Organization', name: 'INTPHY' },
          },
          {
            '@type': 'Course',
            name: 'Grade 12 Physics',
            description: 'Physics curriculum for Grade 12 students in Egypt by Mr. Eslam Rabea.',
            provider: { '@type': 'Organization', name: 'INTPHY' },
          },
        ],
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://int-phy.vercel.app/#website',
      url: 'https://int-phy.vercel.app',
      name: 'INTPHY — Intelligent Physics',
      description: 'Physics education platform by Mr. Eslam Rabea',
      publisher: { '@id': 'https://int-phy.vercel.app/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://int-phy.vercel.app/courses?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${bebasNeue.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'dark:!bg-[#2A2A2A] dark:!border-[#3A3A3A] dark:!text-[#EFEFEF] !bg-white !border-gray-200 !text-gray-800',
              classNames: {
                success: 'border-green-500/40',
                error: 'border-red-500/40',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
