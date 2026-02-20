/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Tightened to exact Supabase project hostname (was **.supabase.co)
        protocol: 'https',
        hostname: 'vrefcmplibzoayfyfidd.supabase.co',
      },
      {
        // Keep wildcard for R2 until a specific bucket subdomain is confirmed
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },

  // Security headers applied to every route
  async headers() {
    // Content Security Policy
    // - Tightened per actual asset sources used in the app
    // - 'unsafe-inline' for styles is required by Tailwind CSS
    // - blob: in media-src is required by hls.js (MSE API)
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-eval' https://cdn.mux.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://vrefcmplibzoayfyfidd.supabase.co https://*.r2.dev`,
      `media-src 'self' blob: https://stream.mux.com`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://storage.googleapis.com https://ingest.mux.com`,
      `frame-src https://www.youtube.com https://www.youtube-nocookie.com`,
      `font-src 'self' data:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — disallow embedding in iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer info sent on navigation
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable camera/mic/geo access from this origin
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },

  experimental: {
    serverActions: {
      // Reduced from 100mb — uploads go direct-to-Mux, not through server actions
      bodySizeLimit: '4mb',
    },
  },
}

export default nextConfig
