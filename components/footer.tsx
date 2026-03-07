import Link from 'next/link'

const YOUTUBE_URL = 'https://www.youtube.com/@mr.ahmed.badawy'
const FACEBOOK_URL = 'https://www.facebook.com/ahmedbadawy2/'
const TIKTOK_URL = 'https://www.tiktok.com/@ahmed.__.badawy'

export function Footer() {
  return (
    <footer className="border-t-2 border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="container-custom py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Brand */}
          <div className="space-y-5">
            <Link href="/" className="inline-block">
              <span
                className="text-4xl text-primary leading-none"
                style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900 }}
              >
                المبدع
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {/* YouTube */}
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-theme-card border border-[var(--border-color)] hover:border-red-500 hover:bg-red-500/10 flex items-center justify-center text-theme-secondary hover:text-red-400 transition-all"
                aria-label="YouTube"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-theme-card border border-[var(--border-color)] hover:border-blue-500 hover:bg-blue-500/10 flex items-center justify-center text-theme-secondary hover:text-blue-400 transition-all"
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-theme-card border border-[var(--border-color)] hover:border-pink-500 hover:bg-pink-500/10 flex items-center justify-center text-theme-secondary hover:text-pink-400 transition-all"
                aria-label="TikTok"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-bold text-theme-secondary uppercase tracking-widest mb-5">تواصل</h3>
            <ul className="space-y-3">
              <li>
                <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-theme-secondary hover:text-primary transition-colors">
                  يوتيوب
                </a>
              </li>
              <li>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-theme-secondary hover:text-primary transition-colors">
                  فيسبوك
                </a>
              </li>
              <li>
                <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-theme-secondary hover:text-primary transition-colors">
                  تيك توك
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-bold text-theme-secondary uppercase tracking-widest mb-5">روابط</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/courses" className="text-sm text-theme-secondary hover:text-primary transition-colors">
                  الكورسات
                </Link>
              </li>
              <li>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-theme-secondary hover:text-primary transition-colors">
                  تواصل مع الإدارة
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-theme-muted">
            &copy; {new Date().getFullYear()} TB DEVS. جميع الحقوق محفوظة.
          </p>
          <p className="text-xs text-theme-muted">
            صُنع لأجل المبدع
          </p>
        </div>
      </div>
    </footer>
  )
}
