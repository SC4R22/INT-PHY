/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable Webpack persistent filesystem cache entirely in dev.
      // Next.js 15.5.x has a known bug where the pack-file index can
      // become inconsistent after restarts, causing module factories to
      // resolve as undefined → "Cannot read properties of undefined
      // (reading 'call')".  In-memory cache still works; only the
      // disk persistence is turned off, so cold-start rebuild time is
      // slightly longer but the crash is gone.
      config.cache = false

      // Also force Webpack to re-evaluate dynamic imports on every build
      // rather than replaying a cached chunk graph. This prevents stale
      // module-factory entries for components loaded with next/dynamic.
      config.module = config.module || {}
      config.module.unsafeCache = false
    }
    return config
  },

  compress: true,
  images: {
    // Allow images from ANY https origin.
    // unoptimized:true alone isn't enough when next/image does domain validation
    // at build/startup time before the config is fully reloaded — so we keep
    // both: unoptimized skips the optimiser pipeline, and the wildcard pattern
    // satisfies the domain-check that runs before unoptimized is respected.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            // In dev, chunks are rebuilt frequently — never cache them.
            // In prod, Next.js content-hashes every chunk filename so
            // immutable caching is safe (a new deploy = new filenames).
            value: isDev
              ? "no-store, no-cache, must-revalidate"
              : "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "ahmed-badwy.vercel.app",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
