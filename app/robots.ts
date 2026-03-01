import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/', '/refresh-session/'],
      },
    ],
    sitemap: 'https://int-phy.vercel.app/sitemap.xml',
    host: 'https://int-phy.vercel.app',
  }
}
