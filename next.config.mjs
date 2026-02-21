/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vrefcmplibzoayfyfidd.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },

  async headers() {
    const csp = [
      `default-src 'self'`,
      // Mux player loads scripts from cdn.mux.com and uses inline eval for HLS
      `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.mux.com https://*.mux.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://vrefcmplibzoayfyfidd.supabase.co https://*.r2.dev https://image.mux.com`,
      // blob: required by hls.js MSE, https://*.mux.com covers all Mux streaming domains
      `media-src 'self' blob: https://stream.mux.com https://*.mux.com`,
      // Mux uses multiple subdomains for API, ingest, and analytics
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://ingest.mux.com https://*.mux.com wss://*.mux.com https://storage.googleapis.com`,
      // worker-src needed for hls.js web workers
      `worker-src 'self' blob:`,
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
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
}

export default nextConfig
