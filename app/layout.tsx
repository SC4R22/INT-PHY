import type { Metadata, Viewport } from 'next'
import { Cairo, Tajawal, Rakkas } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['700', '900'],
  variable: '--font-cairo',
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-tajawal',
  display: 'swap',
})

const rakkas = Rakkas({
  subsets: ['arabic', 'latin'],
  weight: ['400'],
  variable: '--font-rakkas',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a1a',
}

const DOMAIN = 'https://ahmed-badwy.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(DOMAIN),
  title: {
    default: 'المبدع — عربي مع الأستاذ أحمد بدوي',
    template: '%s | المبدع — أحمد بدوي',
  },
  description: 'منصة المبدع — تعلم اللغة العربية مع الأستاذ أحمد بدوي. دروس فيديو HD وكورسات منظمة لطلاب الثانوية العامة في مصر.',
  keywords: ['المبدع', 'احمد بدوي', 'أحمد بدوي', 'عربي اون لاين', 'لغة عربية', 'مستر أحمد بدوي', 'arabic teacher egypt'],
  authors: [{ name: 'أحمد بدوي', url: DOMAIN }],
  creator: 'أحمد بدوي',
  publisher: 'المبدع',
  alternates: { canonical: DOMAIN },

  // PWA manifest link
  manifest: '/manifest.json',

  // Apple PWA meta tags
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'المبدع',
  },

  openGraph: {
    title: 'المبدع — عربي مع الأستاذ أحمد بدوي',
    description: 'تعلم اللغة العربية مع الأستاذ أحمد بدوي على منصة المبدع.',
    url: DOMAIN,
    siteName: 'المبدع',
    type: 'website',
    locale: 'ar_EG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'المبدع — عربي مع الأستاذ أحمد بدوي',
    description: 'تعلم اللغة العربية مع الأستاذ أحمد بدوي على منصة المبدع.',
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization',
      '@id': `${DOMAIN}/#organization`,
      name: 'المبدع',
      url: DOMAIN,
      founder: { '@type': 'Person', name: 'أحمد بدوي', jobTitle: 'Arabic Teacher' },
    },
    {
      '@type': 'WebSite',
      '@id': `${DOMAIN}/#website`,
      url: DOMAIN,
      name: 'المبدع',
      publisher: { '@id': `${DOMAIN}/#organization` },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* PWA service worker registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `
        }} />
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />
      </head>
      <body className={`${cairo.variable} ${tajawal.variable} ${rakkas.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'dark:!bg-[#2A2A2A] dark:!border-[#3A3A3A] dark:!text-[#EFEFEF] !bg-white !border-gray-200 !text-gray-800',
              classNames: { success: 'border-green-500/40', error: 'border-red-500/40' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
