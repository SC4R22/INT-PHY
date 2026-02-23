import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { ConditionalLayout } from '@/components/conditional-layout'
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
  title: {
    default: 'INTPHY — Physics with Mr. Eslam Rabea',
    template: '%s — INTPHY',
  },
  description: 'Master physics with expert video lessons by Mr. Eslam Rabea. Grade 11 & 12 courses with structured modules and progress tracking.',
  keywords: ['physics', 'Grade 11', 'Grade 12', 'Eslam Rabea', 'online learning', 'Egypt'],
  openGraph: {
    title: 'INTPHY — Physics with Mr. Eslam Rabea',
    description: 'Master physics with expert video lessons. Grade 11 & 12 courses.',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css" />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} antialiased bg-[#25292D] text-[#EFEFEF]`}>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#2A2A2A',
              border: '1px solid #3A3A3A',
              color: '#EFEFEF',
            },
            classNames: {
              success: 'border-green-500/40',
              error: 'border-red-500/40',
            },
          }}
        />
      </body>
    </html>
  )
}
